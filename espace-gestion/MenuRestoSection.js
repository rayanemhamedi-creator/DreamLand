import React, { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import televersementService from '../../services/televersementService';

const MenuRestoSection = () => {
    const { user } = useContext(AuthContext);
    const [menus, setMenus] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingMenu, setEditingMenu] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({ nom: '', description: '', prix: 0, quantiteDisponible: 10, actif: true, category: null, image: '' });
    const [categoryFormData, setCategoryFormData] = useState({ nom: '' });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [menusResp, catsResp] = await Promise.all([
                api.get('/menus/mes-menus'),
                api.get('/menus/categories')
            ]);
            setMenus(menusResp.data);
            setCategories(catsResp.data);
        } catch (err) {
            console.error("Erreur chargement données:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await televersementService.televerserImage(file);
            setFormData(prev => ({ ...prev, image: url }));
        } catch (err) {
            alert("Erreur upload image: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmitMenu = async (e) => {
        e.preventDefault();
        if (!formData.category) {
            alert("Veuillez sélectionner une catégorie.");
            return;
        }
        try {
            if (editingMenu) {
                await api.put(`/menus/${editingMenu.id}`, formData);
            } else {
                await api.post('/menus', formData);
            }
            setShowForm(false);
            setEditingMenu(null);
            fetchData();
        } catch (err) {
            alert("Erreur: " + (err.response?.data?.message || err.message));
        }
    };

    const handleSubmitCategory = async (e) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                await api.put(`/menus/categories/${editingCategory.id}`, categoryFormData);
            } else {
                await api.post('/menus/categories', categoryFormData);
            }
            setEditingCategory(null);
            setCategoryFormData({ nom: '' });
            fetchData();
        } catch (err) {
            alert("Erreur: " + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteMenu = async (id) => {
        if(window.confirm('Voulez-vous supprimer ce produit ?')) {
            try {
                await api.delete(`/menus/${id}`);
                fetchData();
            } catch(err) {
                alert("Erreur suppression");
            }
        }
    };

    const handleDeleteCategory = async (id) => {
        if(window.confirm('Voulez-vous supprimer cette catégorie ? Tous les produits associés seront supprimés.')) {
            try {
                await api.delete(`/menus/categories/${id}`);
                fetchData();
            } catch(err) {
                alert("Erreur suppression");
            }
        }
    };

    const toggleStatus = async (menu) => {
        try {
            await api.patch(`/menus/${menu.id}/toggle-status`);
            fetchData();
        } catch(err) {
            alert("Erreur statut");
        }
    };

    return (
        <div className="animate-in-x">
            {!showForm && (
                <>
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
                        <div>
                            <h4 className="fw-800 text-dark mb-1">Gestion du Menu & Carte</h4>
                            <p className="text-muted small">Organisez votre carte par catégories et gérez vos produits.</p>
                        </div>
                        <div className="d-flex gap-2">
                            <button 
                                className="btn rounded-pill px-4 py-2 fw-800 shadow-sm text-white transition-all hover-scale" 
                                style={{ backgroundColor: '#ff7a00' }}
                                onClick={() => {
                                    setEditingMenu(null);
                                    setFormData({ nom: '', description: '', prix: 0, quantiteDisponible: 10, actif: true, category: categories[0] || null, image: '' });
                                    setShowForm(true);
                                }}
                            >
                                <i className="bi bi-plus-lg me-2"></i> Nouveau Produit
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* GESTION DES CATEGORIES (VISIBLE SEULEMENT DANS LA LISTE) */}
            {!showForm && (
                <div className="card border-0 shadow-sm rounded-4 mb-4 border-start border-4 border-dark">
                    <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h5 className="fw-800 mb-0">Gestion des Catégories</h5>
                        </div>
                        <form onSubmit={handleSubmitCategory} className="mb-4">
                                <div className="input-group">
                                    <input required className="form-control rounded-start-pill px-4" placeholder="Nom de catégorie" value={categoryFormData.nom} onChange={e => setCategoryFormData({nom: e.target.value})} />
                                    <button type="submit" className="btn btn-dark rounded-end-pill px-4 fw-700">{editingCategory ? "Modifier" : "Ajouter"}</button>
                                </div>
                            </form>
                            <div className="d-flex flex-wrap gap-2">
                                {categories.map(cat => (
                                    <span key={cat.id} className="badge bg-light text-dark border p-2 px-3 rounded-pill d-flex align-items-center gap-2">
                                        {cat.nom}
                                        <i className="bi bi-pencil text-primary cursor-pointer" onClick={() => { setEditingCategory(cat); setCategoryFormData(cat); }}></i>
                                        <i className="bi bi-trash text-danger cursor-pointer" onClick={() => handleDeleteCategory(cat.id)}></i>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
            )}

            {/* FORMULAIRE PRODUIT */}
            {showForm && (
                <div className="card border-0 shadow-lg rounded-4 mb-4 overflow-hidden">
                    <div className="card-header bg-dark text-white p-4 d-flex justify-content-between align-items-center">
                        <h5 className="fw-800 mb-0">{editingMenu ? "Modifier le produit" : "Nouveau produit"}</h5>
                        <button className="btn btn-sm btn-outline-light rounded-circle" onClick={() => setShowForm(false)}><i className="bi bi-x-lg"></i></button>
                    </div>
                    <div className="card-body p-4 p-md-5">
                        <form onSubmit={handleSubmitMenu}>
                            <div className="row g-4">
                                <div className="col-md-6">
                                    <label className="form-label fw-700 small text-secondary">Nom du produit</label>
                                    <input required className="form-control form-control-lg rounded-3" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} placeholder="Ex: Pizza Margherita" />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-700 small text-secondary">Catégorie</label>
                                    <select required className="form-select form-select-lg rounded-3" value={formData.category?.id || ''} onChange={e => setFormData({...formData, category: categories.find(c => c.id === parseInt(e.target.value))})}>
                                        <option value="">Sélectionner une catégorie...</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.nom}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-12">
                                    <label className="form-label fw-700 small text-secondary">Description</label>
                                    <textarea className="form-control rounded-3" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Détails du plat, ingrédients..."></textarea>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-700 small text-secondary">Prix (DT)</label>
                                    <input required type="number" step="0.5" className="form-control form-control-lg rounded-3" value={formData.prix || ''} onChange={e => setFormData({...formData, prix: e.target.value === '' ? '' : parseFloat(e.target.value)})} />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-700 small text-secondary">Quantité dispo.</label>
                                    <input required type="number" className="form-control form-control-lg rounded-3" value={formData.quantiteDisponible || ''} onChange={e => setFormData({...formData, quantiteDisponible: e.target.value === '' ? '' : parseInt(e.target.value)})} />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-700 small text-secondary">Image</label>
                                    <input type="file" className="form-control" onChange={handleFileChange} disabled={uploading} />
                                    {uploading && <small className="text-primary mt-1 d-block"><span className="spinner-border spinner-border-sm me-1"></span> Téléversement...</small>}
                                    {formData.image && <img src={formData.image} alt="preview" className="mt-2 rounded-3 shadow-sm" style={{width: 60, height: 60, objectFit:'cover'}} />}
                                </div>
                            </div>
                            <div className="mt-4 d-flex justify-content-end gap-3 pt-3 border-top">
                                <button type="button" className="btn btn-light rounded-pill px-4 py-2 fw-700" onClick={() => setShowForm(false)}>Annuler</button>
                                <button type="submit" className="btn rounded-pill px-5 py-2 fw-800 text-white shadow-sm transition-all hover-scale" style={{ backgroundColor: '#ff7a00' }}>{editingMenu ? "Mettre à jour" : "Publier"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {!showForm && (
                loading ? (
                    <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>
                ) : menus.length === 0 ? (
                    <div className="text-center py-5 bg-white rounded-4 shadow-sm border border-dashed">
                        <i className="bi bi-cup-hot display-3 text-muted mb-3 opacity-25 d-block"></i>
                        <h5 className="fw-800 text-dark">Votre carte est vide</h5>
                        <p className="text-muted small">Commencez par ajouter des catégories et vos premiers produits.</p>
                    </div>
                ) : (
                    <div className="row g-4">
                        {categories.map(cat => {
                            const catMenus = menus.filter(m => m.category?.id === cat.id);
                            if (catMenus.length === 0) return null;
                            return (
                                <div key={cat.id} className="col-12 mb-5">
                                    <h5 className="fw-900 text-dark mb-3 d-flex align-items-center gap-2">
                                        <span className="p-2 bg-primary bg-opacity-10 rounded-3 text-primary"><i className="bi bi-tag-fill"></i></span>
                                        {cat.nom}
                                        <span className="badge bg-light text-muted border rounded-pill ms-2 fw-700">{catMenus.length} produits</span>
                                    </h5>
                                    <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                                        <div className="table-responsive">
                                            <table className="table table-hover align-middle mb-0">
                                                <thead className="bg-light">
                                                    <tr>
                                                        <th className="border-0 small fw-800 text-secondary text-uppercase py-3 ps-4">Produit</th>
                                                        <th className="border-0 small fw-800 text-secondary text-uppercase py-3">Prix</th>
                                                        <th className="border-0 small fw-800 text-secondary text-uppercase py-3">Disponibilité</th>
                                                        <th className="border-0 small fw-800 text-secondary text-uppercase py-3 text-end pe-4">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {catMenus.map(menu => (
                                                        <tr key={menu.id} className="bg-white">
                                                            <td className="ps-4 py-3">
                                                                <div className="d-flex align-items-center gap-3">
                                                                    {menu.image ? (
                                                                        <img src={menu.image} alt={menu.nom} className="rounded-3 shadow-sm" style={{width: 50, height: 50, objectFit:'cover', filter: !menu.actif ? 'grayscale(100%)' : 'none'}} />
                                                                    ) : (
                                                                        <div className="bg-light rounded-3 d-flex align-items-center justify-content-center" style={{width: 50, height: 50}}>
                                                                            <i className="bi bi-image text-muted"></i>
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <div className={`fw-800 ${!menu.actif ? 'text-muted text-decoration-line-through' : 'text-dark'}`}>{menu.nom}</div>
                                                                        <div className="text-muted small text-truncate d-none d-md-block" style={{maxWidth: '300px'}}>{menu.description}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span className="fw-900 text-dark fs-5">{menu.prix} <small className="fw-700 text-muted">DT</small></span>
                                                            </td>
                                                            <td>
                                                                <div className="d-flex flex-column gap-1">
                                                                    <span className={`badge rounded-pill px-3 py-1 ${menu.quantiteDisponible > 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`} style={{width: 'fit-content'}}>
                                                                        {menu.quantiteDisponible} en stock
                                                                    </span>
                                                                    <div className="form-check form-switch m-0 small">
                                                                        <input className="form-check-input" type="checkbox" role="switch" checked={menu.actif} onChange={() => toggleStatus(menu)} style={{cursor:'pointer'}} />
                                                                        <span className="ms-1 text-muted smaller fw-600">{menu.actif ? 'Visible' : 'Caché'}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="text-end pe-4">
                                                                <div className="d-flex justify-content-end gap-2">
                                                                    <button className="btn btn-sm btn-outline-primary rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{width: 34, height: 34}} onClick={() => { setFormData(menu); setEditingMenu(menu); setShowForm(true); }} title="Modifier">
                                                                        <i className="bi bi-pencil-fill"></i>
                                                                    </button>
                                                                    <button className="btn btn-sm btn-outline-danger rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{width: 34, height: 34}} onClick={() => handleDeleteMenu(menu.id)} title="Supprimer">
                                                                        <i className="bi bi-trash-fill"></i>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}
        </div>
    );
};

export default MenuRestoSection;
