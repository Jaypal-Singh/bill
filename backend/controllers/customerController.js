const Customer = require('../models/Customer');

const createCustomer = async (req, res) => {
  try {
    const { customerId, name, ownerId } = req.body;

    if (!customerId || !name || !ownerId) {
      return res.status(400).json({ message: 'Please provide customer ID, name, and owner ID' });
    }

    const customerExists = await Customer.findOne({ customerId, ownerId });
    if (customerExists) {
      return res.status(400).json({ message: 'Customer with this ID already exists' });
    }

    const customer = await Customer.create({
      customerId,
      name,
      ownerId
    });

    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCustomers = async (req, res) => {
  try {
    const { ownerId } = req.query;
    if (!ownerId) {
      return res.status(400).json({ message: 'Owner ID is required' });
    }

    const customers = await Customer.find({ ownerId }).sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createCustomer,
  getCustomers
};
