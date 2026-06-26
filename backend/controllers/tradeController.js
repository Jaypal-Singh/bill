const Entry = require('../models/Entry');
const Exit = require('../models/Exit');

const createTrade = async (req, res) => {
  try {
    const { customerId, type, action, symbol, quantity, price, ltp, marginRs, marginPct, date, brokeragePct } = req.body;

    if (!customerId || !type || !action || !symbol || !quantity || !price || !ltp || !date) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const qtyNum = parseFloat(quantity) || 0;
    const priceNum = parseFloat(price) || 0;
    const estimatedTotal = qtyNum * priceNum;
    
    // Server-side brokerage calculation
    let activeBrokeragePct = parseFloat(brokeragePct) || 0.01;
    let brokerageFee = (estimatedTotal * activeBrokeragePct) / 100;
    
    if (type === 'exit') {
      activeBrokeragePct = 0;
      brokerageFee = 0;
    }

    const tradeData = {
      customerId,
      action: action.toLowerCase(),
      symbol: symbol.toUpperCase(),
      quantity: qtyNum,
      price: priceNum,
      ltp: parseFloat(ltp) || 0,
      marginRs: parseFloat(marginRs) || (parseFloat(marginPct) > 0 ? (estimatedTotal * parseFloat(marginPct) / 100) : 0),
      marginPct: parseFloat(marginPct) || 0,
      date,
      brokeragePct: activeBrokeragePct,
      brokerageFee,
      estimatedTotal
    };

    let savedTrade;
    let avgCost = 0;
    if (type === 'entry') {
      savedTrade = await Entry.create(tradeData);
    } else if (type === 'exit') {
      // Calculate Realized PNL directly from the form since entries/exits are decoupled
      // In Exit Form: 'price' is Entry Price, 'ltp' is Exit Price
      let realizedPnl = 0;
      if (action.toLowerCase() === 'sell') { // Exiting a Long position
        realizedPnl = (parseFloat(ltp) - priceNum) * qtyNum;
      } else if (action.toLowerCase() === 'buy') { // Exiting a Short position
        realizedPnl = (priceNum - parseFloat(ltp)) * qtyNum;
      }
      
      realizedPnl -= brokerageFee;
      tradeData.realizedPnl = realizedPnl;

      savedTrade = await Exit.create(tradeData);
    } else {
      return res.status(400).json({ message: 'Invalid trade type' });
    }

    let responseTrade = savedTrade.toObject();
    if (type === 'exit') {
      responseTrade.entryPrice = avgCost;
    }

    res.status(201).json(responseTrade);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCustomerHoldings = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({ message: 'Customer ID is required' });
    }

    // Only fetch entries for Holdings tab as requested by user
    const entries = await Entry.find({ customerId }).lean();
    
    const allTrades = [
      ...entries.map(e => ({ ...e, type: 'entry' }))
    ];

    // Sort by date then createdAt
    allTrades.sort((a, b) => new Date(a.date) - new Date(b.date) || new Date(a.createdAt) - new Date(b.createdAt));
    
    const holdingsMap = {};

    allTrades.forEach(trade => {
      if (!holdingsMap[trade.symbol]) {
        holdingsMap[trade.symbol] = {
          symbol: trade.symbol,
          totalBuyQty: 0,
          totalBuyCost: 0,
          totalSellQty: 0,
          totalSellCost: 0,
          totalBrokerage: 0,
          totalMargin: 0,
          lastPrice: 0
        };
      }

      const holding = holdingsMap[trade.symbol];
      holding.lastPrice = trade.ltp || trade.price; // Fallback to price for older trades
      holding.totalBrokerage += (trade.brokerageFee || 0); // Accumulate brokerage
      const effectiveMargin = trade.marginRs || (trade.marginPct ? (trade.estimatedTotal * trade.marginPct / 100) : 0);
      holding.totalMargin += effectiveMargin; // Accumulate margin

      if (trade.action === 'buy') {
        holding.totalBuyQty += trade.quantity;
        holding.totalBuyCost += (trade.quantity * trade.price);
      } else if (trade.action === 'sell') {
        // This is a Short position entry
        holding.totalSellQty += trade.quantity;
        holding.totalSellCost += (trade.quantity * trade.price);
      }
    });

    const holdings = Object.values(holdingsMap).map(h => {
      // Prevent slight floating point errors from leaving micro-positions open
      if (Math.abs(h.totalBuyQty) < 0.0001) h.totalBuyQty = 0;
      if (Math.abs(h.totalSellQty) < 0.0001) h.totalSellQty = 0;

      const netQty = h.totalBuyQty - h.totalSellQty;
      let type = '';
      let avgCost = 0;
      
      if (netQty > 0) {
        type = 'Buy';
        avgCost = h.totalBuyQty > 0 ? h.totalBuyCost / h.totalBuyQty : 0;
      } else if (netQty < 0) {
        type = 'Sell';
        avgCost = h.totalSellQty > 0 ? h.totalSellCost / h.totalSellQty : 0;
      } else {
        type = 'Closed';
      }

      // Unrealized P/L
      let upnl = 0;
      const absoluteQty = Math.abs(netQty);
      if (type === 'Buy') {
        upnl = (h.lastPrice - avgCost) * absoluteQty;
      } else if (type === 'Sell') {
        upnl = (avgCost - h.lastPrice) * absoluteQty; 
      }
      
      // Deduct total accumulated brokerage from unrealized P/L
      upnl -= h.totalBrokerage;

      return {
        symbol: h.symbol,
        netQty: absoluteQty,
        type,
        avgCost,
        lastPrice: h.lastPrice,
        totalInvestment: absoluteQty * avgCost,
        totalValue: absoluteQty * h.lastPrice,
        totalBrokerage: h.totalBrokerage,
        totalMargin: h.totalMargin,
        upnl
      };
    }).filter(h => h.type !== 'Closed'); // Filter out fully exited positions

    res.json(holdings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getWeeklyRecords = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({ message: 'Customer ID is required' });
    }

    const exits = await Exit.find({ customerId }).sort({ date: -1, createdAt: -1 }).lean();
    res.json(exits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteHolding = async (req, res) => {
  try {
    const { customerId, symbol } = req.params;
    
    if (!customerId || !symbol) {
      return res.status(400).json({ message: 'Customer ID and Symbol are required' });
    }

    // Delete all entries and exits for this symbol to wipe the holding completely
    await Entry.deleteMany({ customerId, symbol: symbol.toUpperCase() });
    await Exit.deleteMany({ customerId, symbol: symbol.toUpperCase() });
    
    res.json({ message: 'Holding deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteExit = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: 'Exit ID is required' });
    }

    await Exit.findByIdAndDelete(id);
    
    res.json({ message: 'Exit record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTrade,
  getCustomerHoldings,
  getWeeklyRecords,
  deleteHolding,
  deleteExit
};
