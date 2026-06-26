import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// Backend API is now used to fetch customers

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ id: '', name: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsedUser = JSON.parse(userInfo);
      setUser(parsedUser);
      fetchCustomers(parsedUser._id);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const fetchCustomers = async (ownerId) => {
    try {
      const { data } = await api.get(`/customers?ownerId=${ownerId}`);
      setCustomers(data);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.post('/customers', {
        customerId: newCustomer.id,
        name: newCustomer.name,
        ownerId: user._id
      });
      
      setNewCustomer({ id: '', name: '' });
      setIsModalOpen(false);
      fetchCustomers(user._id); // Refresh list
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create customer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleCustomerClick = (customer) => {
    navigate(`/customer/${customer._id}`, { state: { customer: { ...customer, id: customer.customerId } } });
  };
  // -------------------------------------------------------------
  // MASTER DASHBOARD VIEW
  // -------------------------------------------------------------
  return (
    <div className="bg-slate-950 text-slate-200 min-h-screen flex flex-col overflow-x-hidden font-sans antialiased relative">
      {/* Create Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-white">Add New Customer</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              {error && <div className="text-rose-400 bg-rose-500/10 p-3 rounded text-sm">{error}</div>}
              
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Customer ID</label>
                <input 
                  type="text" 
                  required
                  value={newCustomer.id}
                  onChange={e => setNewCustomer({...newCustomer, id: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                  placeholder="e.g. CUST-1001"
                />
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Customer Name</label>
                <input 
                  type="text" 
                  required
                  value={newCustomer.name}
                  onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                  placeholder="e.g. Apex Global Funds"
                />
              </div>
              
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Customer'}
                <span className="material-symbols-outlined text-[18px]">person_add</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <header className="p-4 flex items-center justify-between border-b border-slate-800/60">
        <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-700/50 text-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.15)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        </div>
        <button onClick={handleLogout} className="text-slate-400 p-2 rounded hover:bg-slate-800 hover:text-white transition-colors" title="Menu / Logout">
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 pt-3 pb-24 relative z-0">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[20px]">search</span>
            <input 
              className="bg-slate-900/50 border border-slate-800 text-slate-200 text-sm rounded-lg pl-10 pr-4 py-3 focus:border-blue-500 focus:ring-0 transition-colors w-full placeholder:text-slate-500 shadow-inner" 
              placeholder="Search Master Client Registry..." 
              type="text"
            />
          </div>
        </div>

        {/* Section Title */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-[11px] tracking-widest uppercase">
            <span className="material-symbols-outlined text-[16px]">group</span>
            MASTER CLIENT REGISTRY
          </div>
          <div className="flex items-center gap-2">
            <button className="text-slate-400 hover:text-blue-400 transition-colors">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
            </button>
          </div>
        </div>

        {/* Optimized List View */}
        <div className="space-y-4">
          {customers.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
              <p>No customers found. Add one below!</p>
            </div>
          ) : (
            customers.map(customer => (
              <div 
                key={customer._id} 
                onClick={() => handleCustomerClick(customer)}
                className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 hover:border-blue-500/50 transition-colors cursor-pointer shadow-sm relative overflow-hidden group"
              >
                {/* Subtle hover effect background */}
                <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-5 transition-opacity"></div>
                
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <div>
                    <h3 className="font-medium text-slate-100">{customer.name}</h3>
                    <span className="font-mono text-[11px] text-slate-400">{customer.customerId}</span>
                  </div>
                  <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${
                     customer.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                     customer.status === 'Suspended' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                     'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}>
                    {customer.status}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-800 relative z-10">
                  <span className="text-slate-500 text-[11px] uppercase tracking-wider font-bold">Holdings</span>
                  <span className={`font-mono ${customer.holdings === '$0.00' ? 'text-slate-500' : 'text-blue-400'}`}>
                    {customer.holdings}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Floating Action Button (FAB) */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-400 text-white rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.4)] flex items-center justify-center active:scale-95 transition-transform z-50"
      >
        <span className="material-symbols-outlined text-[28px]">person_add</span>
      </button>
    </div>
  );
};

export default Dashboard;
