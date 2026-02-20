
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { SUPER_ADMINS } from '../constants';
import { X, UserPlus, Shield, ShieldAlert, Loader2, Check, User } from 'lucide-react';

interface UserData {
  id?: string; // Firestore ID usually same as email in this logic
  email: string;
  role: 'master' | 'consultant';
  lastLogin?: any;
}

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail: string;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose, currentUserEmail }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snapshot = await db.collection('users').get();
      const loadedUsers: UserData[] = [];
      snapshot.forEach(doc => {
        loadedUsers.push({ id: doc.id, ...doc.data() } as UserData);
      });
      setUsers(loadedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.includes('@') || !newUserEmail.includes('.')) return;
    
    setAdding(true);
    const emailLower = newUserEmail.toLowerCase().trim();

    try {
        // Check if exists
        const existing = users.find(u => u.email === emailLower);
        if (existing) {
            alert('Usuário já existe na lista.');
            return;
        }

        const newUser: UserData = {
            email: emailLower,
            role: 'consultant',
            lastLogin: null
        };

        // Use email as ID for easier lookup
        await db.collection('users').doc(emailLower).set(newUser);
        setUsers(prev => [...prev, newUser]);
        setNewUserEmail('');
    } catch (error) {
        console.error("Error adding user:", error);
        alert('Erro ao adicionar usuário.');
    } finally {
        setAdding(false);
    }
  };

  const toggleRole = async (user: UserData) => {
    // Prevent changing super admins
    if (SUPER_ADMINS.includes(user.email)) return;
    // Prevent removing own master access (safer) although allowed if super admin
    if (user.email === currentUserEmail && !SUPER_ADMINS.includes(currentUserEmail)) {
        if (!confirm('Tem certeza que deseja remover seu próprio acesso Master? Você perderá acesso a esta tela imediatamente.')) {
            return;
        }
    }

    const newRole = user.role === 'master' ? 'consultant' : 'master';
    
    try {
        await db.collection('users').doc(user.email).update({ role: newRole });
        setUsers(prev => prev.map(u => u.email === user.email ? { ...u, role: newRole } : u));
        
        // If user removed their own access, close modal
        if (user.email === currentUserEmail && newRole === 'consultant') {
            onClose();
            window.location.reload(); // Reload to refresh permissions
        }

    } catch (error) {
        console.error("Error updating role:", error);
        alert('Erro ao atualizar permissão.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-[#71477A] p-6 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                    <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Gerenciar Usuários</h2>
                    <p className="text-purple-200 text-xs">Controle de acesso Master e Consultores</p>
                </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
            
            {/* Add User Form */}
            <form onSubmit={handleAddUser} className="mb-8 flex gap-3">
                <div className="flex-1 relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input 
                        type="email" 
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="Adicionar e-mail manualmente..." 
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#71477A] outline-none"
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={adding || !newUserEmail}
                    className="bg-[#8BBF56] hover:bg-[#7aa84b] text-white px-6 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Adicionar
                </button>
            </form>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-[#71477A] animate-spin" /></div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-3">Usuário</th>
                                <th className="px-5 py-3">Permissão</th>
                                <th className="px-5 py-3 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map(user => {
                                const isSuper = SUPER_ADMINS.includes(user.email);
                                const isMaster = user.role === 'master' || isSuper;
                                
                                return (
                                    <tr key={user.email} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isMaster ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-500'}`}>
                                                    {isSuper ? <ShieldAlert className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900">{user.email}</div>
                                                    {isSuper && <span className="text-[10px] text-purple-600 font-bold">SUPER ADMIN</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                                                isMaster ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {isMaster ? 'Master' : 'Consultor'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <button 
                                                onClick={() => toggleRole(user)}
                                                disabled={isSuper}
                                                className={`text-xs font-bold px-3 py-1.5 rounded transition-colors ${
                                                    isSuper 
                                                        ? 'text-slate-300 cursor-not-allowed' 
                                                        : isMaster 
                                                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                                                            : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                                                }`}
                                            >
                                                {isSuper ? 'Imutável' : isMaster ? 'Tornar Consultor' : 'Tornar Master'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
