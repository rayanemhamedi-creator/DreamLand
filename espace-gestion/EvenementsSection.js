import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import televersementService from '../../services/televersementService';
import MapPicker from './SelecteurCarte';

const EvenementsSection = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [form, setForm] = useState({
        titre: '',
        description: '',
        dateDebut: '',
        dateFin: '',
        lieu: '',
        localisation: '',
        prix: 0,
        placesDisponibles: 50,
        urlImage: ''
    });

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        try {
            let newUrls = [];
            if (files.length > 1) {
                newUrls = await televersementService.televerserPlusieursImages(files);
            } else {
                const url = await televersementService.televerserImage(files[0]);
                newUrls = [url];
            }

            setForm(prev => {
                const current = prev.urlImage ? prev.urlImage.split(',').filter(Boolean) : [];
                return { ...prev, urlImage: [...current, ...newUrls].join(',') };
            });
        } catch (err) {
            alert("❌ Erreur d'upload : " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (index) => {
        setForm(prev => {
            const current = prev.urlImage ? prev.urlImage.split(',').filter(Boolean) : [];
            const updated = [...current];
            updated.splice(index, 1);
            return { ...prev, urlImage: updated.join(',') };
        });
    };

    useEffect(() => { fetchEvents(); }, []);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await api.get('/evenements');
            setEvents(res.data);
        } catch (err) {
            console.error("Erreur événements:", err);
        } finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const start = new Date(form.dateDebut);
        const end = new Date(form.dateFin);

        if (start < new Date()) {
            alert("❌ Vous ne pouvez pas créer un événement pour une date déjà passée. Veuillez choisir une date future.");
            return;
        }

        if (start >= end) {
            alert("❌ La date de début ne peut pas être après ou égale à la date de fin.");
            return;
        }

        try {
            if (editingEvent) {
                await api.put(`/evenements/${editingEvent.id}`, form);
                alert("✅ Événement mis à jour !");
            } else {
                await api.post('/evenements', form);
                alert("✅ Événement créé avec succès !");
            }
            setShowAddForm(false);
            setEditingEvent(null);
            fetchEvents();
        } catch (err) {
            alert("❌ Erreur: " + (err.response?.data?.message || err.message));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("🗑️ Supprimer cet événement ?")) {
            try {
                await api.delete(`/evenements/${id}`);
                fetchEvents();
            } catch (err) { alert("❌ Erreur suppression"); }
        }
    };

    if (loading) return <div>Chargement...</div>;

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-5 animate-in-y">
                <div>
                    <h2 className="fw-800 text-dark mb-1">📅 Gestion des Événements</h2>
                    <p className="text-muted small mb-0">Créez et gérez les expériences culturelles pour les touristes</p>
                </div>
                <button 
                    onClick={() => { setEditingEvent(null); setForm({ titre: '', description: '', dateDebut: '', dateFin: '', lieu: '', localisation: '', prix: 0, placesDisponibles: 50, urlImage: '' }); setShowAddForm(true); }}
                    className="btn btn-success rounded-pill px-4 py-3 fw-800 shadow-sm border-0 transition-all hover-scale d-flex align-items-center gap-2"
                    style={{ background: '#10b981' }}
                >
                    <i className="bi bi-plus-lg"></i>
                    Créer un événement
                </button>
            </div>

            {showAddForm && (
                <div className="modern-form-container animate-in-y">
                    <div className="d-flex align-items-center gap-3 mb-4">
                        <div className="bg-success-subtle p-3 rounded-circle text-success">
                            <i className={`bi ${editingEvent ? 'bi-pencil-square' : 'bi-plus-circle-fill'} fs-4`}></i>
                        </div>
                        <div>
                            <h3 className="fw-800 text-dark mb-0">{editingEvent ? "Modifier l'événement" : "Nouvel événement"}</h3>
                            <p className="text-muted small mb-0">Remplissez les détails pour publier sur le catalogue</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="row g-4">
                        <div className="col-12">
                            <div className="form-group-modern">
                                <label className="label-modern">Titre de l'événement</label>
                                <div className="input-with-icon">
                                    <i className="bi bi-type text-muted"></i>
                                    <input required placeholder="Ex: Festival de la Musique..." value={form.titre} onChange={e => setForm({...form, titre: e.target.value})} className="input-modern" />
                                </div>
                            </div>
                        </div>

                        <div className="col-12">
                            <div className="form-group-modern">
                                <label className="label-modern">Description détaillée</label>
                                <textarea rows="3" placeholder="Décrivez votre événement en quelques lignes..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-modern py-3" />
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="form-group-modern">
                                <label className="label-modern">Date et Heure de Début</label>
                                    <div className="input-with-icon">
                                        <i className="bi bi-calendar-event text-muted"></i>
                                        <input 
                                            type="datetime-local" 
                                            required 
                                            min={new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16)}
                                            value={form.dateDebut} 
                                            onChange={e => {
                                                const val = e.target.value;
                                                setForm(prev => {
                                                    const updates = { ...prev, dateDebut: val };
                                                    if (prev.dateFin) {
                                                        const start = new Date(val);
                                                        const end = new Date(prev.dateFin);
                                                        if (end <= start) {
                                                            const nextHour = new Date(start);
                                                            nextHour.setHours(nextHour.getHours() + 1);
                                                            updates.dateFin = new Date(nextHour.getTime() - (nextHour.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                                                        }
                                                    }
                                                    return updates;
                                                });
                                            }} 
                                            className="input-modern" 
                                        />
                                    </div>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="form-group-modern">
                                <label className="label-modern">Date et Heure de Fin</label>
                                    <div className="input-with-icon">
                                        <i className="bi bi-calendar-check text-muted"></i>
                                        <input 
                                            type="datetime-local" 
                                            required 
                                            min={form.dateDebut || new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16)}
                                            value={form.dateFin} 
                                            onChange={e => setForm({...form, dateFin: e.target.value})} 
                                            className="input-modern" 
                                        />
                                    </div>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="form-group-modern">
                                <label className="label-modern">Localisation Précise (Carte)</label>
                                <MapPicker 
                                    initialValue={form.localisation}
                                    onChange={(val) => setForm(prev => ({...prev, localisation: val}))}
                                    onAddressChange={(addr) => setForm(prev => ({...prev, lieu: addr}))}
                                />
                            </div>
                        </div>

                        <div className="col-md-6">
                            <div className="form-group-modern">
                                <label className="label-modern">Lieu / Emplacement (Généré ou Manuel)</label>
                                <div className="input-with-icon">
                                    <i className="bi bi-geo-alt text-muted"></i>
                                    <input required placeholder="Ex: Place des Arts, Midoun..." value={form.lieu} onChange={e => setForm({...form, lieu: e.target.value})} className="input-modern" />
                                </div>
                            </div>
                        </div>

                        <div className="col-md-3">
                            <div className="form-group-modern">
                                <label className="label-modern">Prix (DT)</label>
                                <div className="input-with-icon">
                                    <i className="bi bi-cash-coin text-muted"></i>
                                    <input type="number" step="0.01" required value={form.prix} onChange={e => setForm({...form, prix: parseFloat(e.target.value)})} className="input-modern" />
                                </div>
                            </div>
                        </div>

                        <div className="col-md-3">
                            <div className="form-group-modern">
                                <label className="label-modern">Places</label>
                                <div className="input-with-icon">
                                    <i className="bi bi-people text-muted"></i>
                                    <input type="number" required value={form.placesDisponibles} onChange={e => setForm({...form, placesDisponibles: parseInt(e.target.value)})} className="input-modern" />
                                </div>
                            </div>
                        </div>

                        <div className="col-12">
                            <label className="label-modern">Galerie d'images de l'événement</label>
                            <div className="image-upload-modern p-4 rounded-4 border-dashed bg-light">
                                <div className="row g-3 mb-3">
                                    {(form.urlImage ? form.urlImage.split(',').filter(Boolean) : []).map((url, idx) => (
                                        <div key={idx} className="col-6 col-md-4 col-lg-3">
                                            <div className="position-relative group shadow-sm rounded-4 overflow-hidden" style={{ height: '120px' }}>
                                                <img src={url} alt={`Evt ${idx}`} className="w-100 h-100 object-fit-cover transition-all" />
                                                <button 
                                                    type="button"
                                                    onClick={() => removeImage(idx)}
                                                    className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 rounded-circle shadow-sm"
                                                    style={{ width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <i className="bi bi-trash fs-6"></i>
                                                </button>
                                                <div className="position-absolute bottom-0 start-0 w-100 bg-dark bg-opacity-50 text-white text-center py-1 smaller fw-700">
                                                    Photo {idx + 1}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="col-6 col-md-4 col-lg-3">
                                        <label htmlFor="evt-photo" className="w-100 h-100 d-flex flex-column align-items-center justify-content-center border border-2 border-dashed rounded-4 bg-white transition-all hover-bg-primary-subtle cursor-pointer" style={{ minHeight: '120px' }}>
                                            {uploading ? (
                                                <div className="spinner-border spinner-border-sm text-primary mb-2"></div>
                                            ) : (
                                                <i className="bi bi-plus-lg fs-3 text-primary mb-1"></i>
                                            )}
                                            <span className="smaller fw-700 text-primary">Ajouter</span>
                                            <input 
                                                type="file" 
                                                id="evt-photo" 
                                                hidden 
                                                multiple 
                                                onChange={handleFileChange} 
                                                disabled={uploading} 
                                                accept="image/*"
                                            />
                                        </label>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-muted small mb-0"><i className="bi bi-info-circle me-1"></i> Téléchargez plusieurs photos pour créer un diaporama attrayant.</p>
                                </div>
                            </div>
                        </div>

                        <div className="col-12 d-flex gap-3 justify-content-end mt-4">
                            <button type="button" onClick={() => setShowAddForm(false)} className="btn btn-light rounded-pill px-5 py-3 fw-700 text-muted">Annuler</button>
                            <button type="submit" className="btn btn-success rounded-pill px-5 py-3 fw-800 shadow-lg transition-all hover-scale border-0" style={{ background: '#10b981' }}>
                                {editingEvent ? "Enregistrer les modifications" : "Créer l'événement de rêve"}
                            </button>
                        </div>
                    </form>

                    <style>{`
                        .modern-form-container {
                            background: white;
                            padding: 40px;
                            border-radius: 30px;
                            box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1);
                            border: 1px solid #f1f5f9;
                            margin-bottom: 50px;
                            position: relative;
                        }
                        .form-group-modern { margin-bottom: 5px; }
                        .label-modern { 
                            display: block; 
                            font-weight: 700; 
                            color: #64748b; 
                            font-size: 13px; 
                            text-uppercase; 
                            letter-spacing: 0.5px;
                            margin-bottom: 8px;
                            padding-left: 2px;
                        }
                        .input-with-icon { position: relative; }
                        .input-with-icon i { 
                            position: absolute; 
                            left: 18px; 
                            top: 50%; 
                            transform: translateY(-50%); 
                            font-size: 18px; 
                        }
                        .input-modern {
                            width: 100%;
                            background: #f8fafc;
                            border: 2px solid #f1f5f9;
                            border-radius: 16px;
                            padding: 14px 14px 14px 50px;
                            font-weight: 600;
                            color: #1e293b;
                            transition: 0.3s;
                        }
                        textarea.input-modern { padding-left: 18px; }
                        .input-modern:focus {
                            outline: none;
                            border-color: #10b981;
                            background: white;
                            box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
                        }
                        .image-upload-modern {
                            background: #f8fafc;
                            border: 2px dashed #e2e8f0;
                        }
                        .modern-form-container::before {
                            content: '';
                            position: absolute;
                            top: 0;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 50px;
                            height: 6px;
                            background: #10b981;
                            border-radius: 0 0 10px 10px;
                            opacity: 0.3;
                        }
                    `}</style>
                </div>
            )}

            {/* Événements à venir */}
            <div className="mb-5">
                <h6 className="fw-800 text-uppercase letter-spacing-1 text-primary mb-4 border-bottom pb-2"><i className="bi bi-calendar-event me-2"></i> Événements à venir</h6>
                <div className="row g-4 overflow-hidden">
                    {events.filter(e => !e.dateDebut || new Date(e.dateDebut) >= new Date()).sort((a, b) => new Date(a.dateDebut) - new Date(b.dateDebut)).map((ev, index) => (
                        <div key={ev.id} className="col-12 col-md-6 col-lg-4 animate-in-y" style={{ animationDelay: `${index * 0.1}s` }}>
                            <div className="card border-0 shadow-sm rounded-4 overflow-hidden h-100 transition-all shadow-hover hover-translate-y group">
                                <div className="position-relative overflow-hidden" style={{ height: '200px' }}>
                                    {ev.urlImage ? (
                                        <img src={ev.urlImage} alt={ev.titre} className="w-100 h-100 object-fit-cover transition-all" />
                                    ) : (
                                        <div className="w-100 h-100 bg-light d-flex align-items-center justify-content-center">
                                            <i className="bi bi-calendar-event text-muted opacity-25 display-4"></i>
                                        </div>
                                    )}
                                    <div className="position-absolute top-0 end-0 m-3 d-flex gap-2">
                                        <button className="btn btn-white btn-sm rounded-circle shadow-sm transition-all hover-scale" onClick={() => { setEditingEvent(ev); setForm(ev); setShowAddForm(true); }}>
                                            <i className="bi bi-pencil-fill text-primary"></i>
                                        </button>
                                        <button className="btn btn-white btn-sm rounded-circle shadow-sm transition-all hover-scale" onClick={() => handleDelete(ev.id)}>
                                            <i className="bi bi-trash-fill text-danger"></i>
                                        </button>
                                    </div>
                                    <div className="position-absolute bottom-0 start-0 m-3">
                                        <span className="badge rounded-pill bg-dark py-2 px-3 fw-700 shadow-sm border border-secondary" style={{ backdropFilter: 'blur(10px)', opacity: 0.9 }}>
                                            {ev.prix} DT
                                        </span>
                                    </div>
                                </div>
                                <div className="card-body p-4">
                                    <h4 className="fw-800 text-dark mb-2">{ev.titre}</h4>
                                    <p className="text-secondary small mb-3 line-clamp-2" style={{ height: '40px', overflow: 'hidden' }}>
                                        {ev.description || "Aucune description fournie pour cet événement."}
                                    </p>
                                    <div className="d-grid gap-2 mt-auto">
                                        <div className="d-flex align-items-center small fw-700 px-2 py-1 rounded text-success bg-success bg-opacity-10">
                                            <i className="bi bi-calendar-check me-2"></i>
                                            {new Date(ev.dateDebut).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="d-flex align-items-center text-muted small">
                                            <i className="bi bi-geo-alt-fill me-2 text-primary"></i>
                                            <span className="text-truncate">{ev.lieu}</span>
                                        </div>
                                        <div className="d-flex align-items-center text-muted small">
                                            <i className="bi bi-ticket-perforated me-2 text-primary"></i>
                                            {ev.placesDisponibles} places disponibles
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {events.filter(e => !e.dateDebut || new Date(e.dateDebut) >= new Date()).length === 0 && (
                        <div className="col-12 py-4 text-center text-muted border border-2 border-dashed rounded-4">
                            <p className="fw-700 mb-0">Aucun événement à venir.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Événements passés */}
            <div className="mb-4">
                <h6 className="fw-800 text-uppercase letter-spacing-1 text-secondary mb-4 border-bottom pb-2"><i className="bi bi-calendar-x me-2"></i> Événements passés</h6>
                <div className="row g-4 overflow-hidden opacity-75">
                    {events.filter(e => e.dateDebut && new Date(e.dateDebut) < new Date()).sort((a, b) => new Date(b.dateDebut) - new Date(a.dateDebut)).map((ev, index) => (
                        <div key={ev.id} className="col-12 col-md-6 col-lg-4 animate-in-y" style={{ animationDelay: `${index * 0.1}s` }}>
                            <div className="card border-0 shadow-sm rounded-4 overflow-hidden h-100 transition-all shadow-hover group">
                                <div className="position-relative overflow-hidden" style={{ height: '200px' }}>
                                    {ev.urlImage ? (
                                        <img src={ev.urlImage} alt={ev.titre} className="w-100 h-100 object-fit-cover grayscale" />
                                    ) : (
                                        <div className="w-100 h-100 bg-light d-flex align-items-center justify-content-center">
                                            <i className="bi bi-calendar-event text-muted opacity-25 display-4"></i>
                                        </div>
                                    )}
                                    <div className="position-absolute top-0 end-0 m-3 d-flex gap-2">
                                        <button className="btn btn-white btn-sm rounded-circle shadow-sm transition-all hover-scale" onClick={() => handleDelete(ev.id)}>
                                            <i className="bi bi-trash-fill text-danger"></i>
                                        </button>
                                    </div>
                                    <div className="position-absolute bottom-0 start-0 m-3">
                                        <span className="badge rounded-pill bg-dark py-2 px-3 fw-700 shadow-sm border border-secondary" style={{ backdropFilter: 'blur(10px)', opacity: 0.9 }}>
                                            Terminé
                                        </span>
                                    </div>
                                </div>
                                <div className="card-body p-4">
                                    <h4 className="fw-800 text-dark mb-2">{ev.titre}</h4>
                                    <p className="text-secondary small mb-3 line-clamp-2" style={{ height: '40px', overflow: 'hidden' }}>
                                        {ev.description || "Aucune description fournie pour cet événement."}
                                    </p>
                                    <div className="d-grid gap-2 mt-auto">
                                        <div className="d-flex align-items-center small fw-700 px-2 py-1 rounded text-danger bg-danger bg-opacity-10">
                                            <i className="bi bi-calendar-x me-2"></i>
                                            {new Date(ev.dateDebut).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="d-flex align-items-center text-muted small">
                                            <i className="bi bi-geo-alt-fill me-2 text-primary"></i>
                                            <span className="text-truncate">{ev.lieu}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {events.filter(e => e.dateDebut && new Date(e.dateDebut) < new Date()).length === 0 && (
                        <div className="col-12 py-4 text-center text-muted border border-2 border-dashed rounded-4">
                            <p className="fw-700 mb-0">Aucun événement passé.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EvenementsSection;
