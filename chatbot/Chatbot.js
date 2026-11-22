import React, { useState, useEffect, useRef, useContext } from 'react';
import api from '../../services/api';
import './Chatbot.css';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const QUESTIONS = [
    {
        id: 'isFirstVisit',
        text: 'Bienvenue sur DreamLand ! Est-ce votre première visite sur notre magnifique île ? 🏝️',
        type: 'buttons',
        options: ['Oui', 'Non']
    },
    {
        id: 'hasAccommodation',
        text: 'Avez-vous déjà un hébergement réservé à Djerba ? 🏠',
        type: 'buttons',
        options: ['Oui, j\'ai déjà un logement', 'Non, je cherche un hôtel']
    },
    {
        id: 'days',
        text: 'Super ! Combien de jours prévoyez-vous de rester avec nous ? 📅',
        type: 'buttons',
        options: [
            { label: '1-3 jours', value: 2 },
            { label: '4-7 jours', value: 5 },
            { label: 'Plus d\'une semaine', value: 10 }
        ]
    },
    {
        id: 'budget',
        text: 'Quel est votre budget pour ce séjour ? 💰',
        type: 'buttons',
        options: [
            { label: 'Faible (Économique)', value: 'low' },
            { label: 'Moyen (Confort)', value: 'medium' },
            { label: 'Élevé (Luxe)', value: 'high' }
        ]
    },
    {
        id: 'preferences',
        text: 'Quelles activités vous font vibrer ? (Sélectionnez-en plusieurs) ✨',
        type: 'multi-select',
        options: ['Plage', 'Sport', 'Culture', 'Détente', 'Événements', 'Cinéma']
    },
    {
        id: 'travelType',
        text: 'Avec qui partagez-vous cette aventure ? 👨‍👩‍👧‍👦',
        type: 'buttons',
        options: ['Seul', 'En couple', 'En famille']
    },
    {
        id: 'needGuide',
        text: 'Souhaitez-vous être accompagné par un guide local certifié pour découvrir les secrets de l\'île ? 🗣️',
        type: 'buttons',
        options: ['Oui, je cherche un guide', 'Non, je préfère explorer seul']
    },
    {
        id: 'needResto',
        text: 'Voulez-vous découvrir les meilleurs restaurants et cafés traditionnels de Djerba ? ☕',
        type: 'buttons',
        options: ['Oui, montrez-moi la gastronomie', 'Non merci']
    }
];

const Chatbot = () => {
    const { user } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const chatEndRef = useRef(null);

    // Visibility Logic: Only show for tourists or guests
    const userRole = user?.role?.replace('ROLE_', '');
    const isTouristOrGuest = !user || userRole === 'TOURISTE';

    useEffect(() => {
        if (isOpen) {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [isOpen, step, result, loading]);

    if (!isTouristOrGuest) return null;

    const handleAnswer = (value) => {
        const currentQuestion = QUESTIONS[step];
        const newAnswers = { ...answers, [currentQuestion.id]: value };
        setAnswers(newAnswers);

        if (step < QUESTIONS.length - 1) {
            setStep(step + 1);
        } else {
            generatePlan(newAnswers);
        }
    };

    const handleMultiSelect = (option) => {
        const currentQuestion = QUESTIONS[step];
        const currentSelected = answers[currentQuestion.id] || [];
        let newSelected;
        if (currentSelected.includes(option)) {
            newSelected = currentSelected.filter(o => o !== option);
        } else {
            newSelected = [...currentSelected, option];
        }
        setAnswers({ ...answers, [currentQuestion.id]: newSelected });
    };

    const generatePlan = async (finalAnswers, isRegenerate = false) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('/chatbot/generate-plan', {
                ...finalAnswers,
                regenerate: isRegenerate
            });
            setResult(response.data);
            setStep(QUESTIONS.length); // Move beyond questions
        } catch (err) {
            setError(err.response?.data?.message || "Une erreur est survenue lors de la génération du plan.");
        } finally {
            setLoading(false);
        }
    };

    const resetChat = () => {
        setStep(0);
        setAnswers({});
        setResult(null);
        setError(null);
    };

    const formatPlan = (text) => {
        if (!text) return null;
        
        // Split by days while keeping the "Jour X" parts
        const sections = text.split(/(?=Jour \d+\s*[:*]+)/i);
        
        return sections.map((section, idx) => {
            const lines = section.trim().split('\n').filter(l => l.trim());
            if (lines.length === 0) return null;

            // Clean title from **, #, 📅, etc.
            const title = lines[0].replace(/[\*\#📅]/g, '').trim();
            const content = lines.slice(1);
            
            if (title.toLowerCase().startsWith('jour')) {
                return (
                    <div key={idx} className="plan-day-container">
                        <div className="plan-day-title">
                            <i className="bi bi-calendar-check me-2"></i> {title}
                        </div>
                        <div className="plan-day-content">
                            {content.map((line, lIdx) => (
                                <div key={lIdx} className="plan-item">
                                    <i className="bi bi-chevron-right me-2 text-orange"></i>
                                    {line.replace(/^[-*]\s*/, '').replace(/\*\*/g, '').trim()}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }
            return <p key={idx} className="plan-intro">{section.replace(/\*\*/g, '').trim()}</p>;
        });
    };

    const renderQuestion = () => {
        if (step >= QUESTIONS.length) return null;
        const q = QUESTIONS[step];

        return (
            <div className="chat-msg msg-ai">
                <p>{q.text}</p>
                <div className="chatbot-options">
                    {q.type === 'buttons' ? (
                        q.options.map((opt, idx) => (
                            <button 
                                key={idx} 
                                className="option-btn"
                                onClick={() => handleAnswer(typeof opt === 'object' ? opt.value : opt)}
                            >
                                {typeof opt === 'object' ? opt.label : opt}
                            </button>
                        ))
                    ) : (
                        <>
                            {q.options.map((opt, idx) => (
                                <button 
                                    key={idx} 
                                    className={`option-btn ${(answers[q.id] || []).includes(opt) ? 'selected' : ''}`}
                                    onClick={() => handleMultiSelect(opt)}
                                >
                                    {opt}
                                </button>
                            ))}
                            <button 
                                className="option-btn btn-valider"
                                onClick={() => handleAnswer(answers[q.id] || [])}
                                disabled={!(answers[q.id] || []).length}
                            >
                                Valider
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="chatbot-container">
            <div className="chatbot-bubble" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <i className="bi bi-x-lg"></i> : <i className="bi bi-stars"></i>}
            </div>

            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <h3>Assistant Voyage Djerba AI 🤖</h3>
                        <i className="bi bi-dash-lg cursor-pointer" onClick={() => setIsOpen(false)}></i>
                    </div>

                    <div className="chatbot-content">
                        {/* History of answers */}
                        {QUESTIONS.slice(0, step).map((q, idx) => (
                            <React.Fragment key={idx}>
                                <div className="chat-msg msg-ai"><p>{q.text}</p></div>
                                <div className="chat-msg msg-user">
                                    <p>{Array.isArray(answers[q.id]) ? answers[q.id].join(', ') : 
                                        (typeof q.options[0] === 'object' ? q.options.find(o => o.value === answers[q.id])?.label : answers[q.id])}</p>
                                </div>
                            </React.Fragment>
                        ))}

                        {/* Current question or loader or result */}
                        {loading ? (
                            <div className="loader-container">
                                <div className="spinner"></div>
                                <p>Génération de votre voyage sur mesure... ✨</p>
                            </div>
                        ) : error ? (
                            <div className="chat-msg msg-ai" style={{ color: '#ef4444' }}>
                                <p>❌ {error}</p>
                                <button className="option-btn mt-2" onClick={resetChat}>Réessayer</button>
                            </div>
                        ) : result ? (
                            <>
                                <div className="chat-msg msg-ai">
                                    <p>Voici votre plan personnalisé ! 🌴</p>
                                    <div className="plan-result">
                                        {formatPlan(result.plan)}
                                        {result.message && (
                                            <div className="mt-3 p-2 rounded" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '11px', color: 'rgba(255,255,255,0.4)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                                <i className="bi bi-info-circle me-1"></i> Optimisé localement
                                            </div>
                                        )}
                                    </div>
                                </div>
                                    
                                {result.hotels?.length > 0 && (!answers.hasAccommodation || !answers.hasAccommodation.toLowerCase().startsWith('oui')) && (
                                    <div className="recommendations-section">
                                        <h5>Hébergements recommandés 🏨</h5>
                                        {result.hotels.slice(0, 3).map(h => {
                                            const imgSrc = h.urlImage ? h.urlImage.split(',').filter(Boolean)[0] : null;
                                            return (
                                            <Link to={`/hotel/${h.id}`} key={h.id} className="rec-card text-decoration-none">
                                                {imgSrc ? (
                                                    <img src={imgSrc} alt={h.nom} className="rec-img" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                                                ) : null}
                                                <div className="rec-img-placeholder" style={{ display: imgSrc ? 'none' : 'flex' }}>🏨</div>
                                                <div className="rec-info">
                                                    <h4>{h.nom || "Hôtel"}</h4>
                                                    <p>{h.localisation} • {h.prix} DT</p>
                                                </div>
                                            </Link>
                                            );
                                        })}
                                    </div>
                                )}

                                {result.restaurants?.length > 0 && (
                                    <div className="recommendations-section">
                                        <h5>Restaurants & Cafés 🍽️☕</h5>
                                        {result.restaurants.slice(0, 4).map(r => {
                                            const imgSrc = r.urlImage ? r.urlImage.split(',').filter(Boolean)[0] : null;
                                            return (
                                            <Link to={`/reservation-resto/${r.id}`} key={r.id} className="rec-card text-decoration-none">
                                                {imgSrc ? (
                                                    <img src={imgSrc} alt={r.nom} className="rec-img" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                                                ) : null}
                                                <div className="rec-img-placeholder" style={{ display: imgSrc ? 'none' : 'flex' }}>🍽️</div>
                                                <div className="rec-info">
                                                    <h4>{r.nom || "Restaurant"}</h4>
                                                    <p>{r.type} • {r.adresse}</p>
                                                </div>
                                            </Link>
                                            );
                                        })}
                                    </div>
                                )}

                                {result.activities?.length > 0 && (
                                    <div className="recommendations-section">
                                        <h5>Activités & Loisirs 🎨</h5>
                                        {result.activities.slice(0, 4).map(a => {
                                            const imgSrc = a.urlImage ? a.urlImage.split(',').filter(Boolean)[0] : null;
                                            return (
                                            <Link to={`/sortie-detail/${a.id}`} key={a.id} className="rec-card text-decoration-none">
                                                {imgSrc ? (
                                                    <img src={imgSrc} alt={a.titre} className="rec-img" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                                                ) : null}
                                                <div className="rec-img-placeholder" style={{ display: imgSrc ? 'none' : 'flex' }}>🎨</div>
                                                <div className="rec-info">
                                                    <h4>{a.titre}</h4>
                                                    <p>{a.typeSortie} • {a.prix} DT</p>
                                                </div>
                                            </Link>
                                            );
                                        })}
                                    </div>
                                )}

                                {result.sports?.length > 0 && (
                                    <div className="recommendations-section">
                                        <h5>Activités Sportives 🎾</h5>
                                        {result.sports.slice(0, 3).map(s => {
                                            const imgSrc = s.urlImage ? s.urlImage.split(',').filter(Boolean)[0] : null;
                                            return (
                                            <Link to={`/reserver-sport/${s.id}`} key={s.id} className="rec-card text-decoration-none">
                                                {imgSrc ? (
                                                    <img src={imgSrc} alt={s.nomActivite} className="rec-img" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                                                ) : null}
                                                <div className="rec-img-placeholder" style={{ display: imgSrc ? 'none' : 'flex' }}>🎾</div>
                                                <div className="rec-info">
                                                    <h4>{s.nomActivite}</h4>
                                                    <p>{s.lieu} • {s.prix} DT</p>
                                                </div>
                                            </Link>
                                            );
                                        })}
                                    </div>
                                )}

                                {result.events?.length > 0 && (
                                    <div className="recommendations-section">
                                        <h5>Événements à venir 📅</h5>
                                        {result.events.slice(0, 3).map(e => {
                                            const imgSrc = e.urlImage ? e.urlImage.split(',').filter(Boolean)[0] : null;
                                            return (
                                            <Link to={`/reserver-ticket/evenement/${e.id}`} key={e.id} className="rec-card text-decoration-none">
                                                {imgSrc ? (
                                                    <img src={imgSrc} alt={e.titre} className="rec-img" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                                                ) : null}
                                                <div className="rec-img-placeholder" style={{ display: imgSrc ? 'none' : 'flex' }}>📅</div>
                                                <div className="rec-info">
                                                    <h4>{e.titre}</h4>
                                                    <p>{new Date(e.dateDebut).toLocaleDateString()} • {e.lieu}</p>
                                                </div>
                                            </Link>
                                            );
                                        })}
                                    </div>
                                )}

                                {result.guides?.length > 0 && (
                                    <div className="recommendations-section">
                                        <h5>Nos Guides Locaux 🗣️</h5>
                                        {result.guides.slice(0, 3).map(g => {
                                            const imgSrc = g.urlImage ? g.urlImage.split(',').filter(Boolean)[0] : null;
                                            return (
                                            <Link to={`/reserver-sortie/${g.id}`} key={g.id} className="rec-card text-decoration-none">
                                                {imgSrc ? (
                                                    <img src={imgSrc} alt={g.nom} className="rec-img" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                                                ) : null}
                                                <div className="rec-img-placeholder" style={{ display: imgSrc ? 'none' : 'flex' }}>🗣️</div>
                                                <div className="rec-info">
                                                    <h4>{g.nom} {g.prenom}</h4>
                                                    <p>{g.languesParlees || 'Français'} • Guide certifié</p>
                                                </div>
                                            </Link>
                                            );
                                        })}
                                    </div>
                                )}

                                {result.films?.length > 0 && (
                                    <div className="recommendations-section">
                                        <h5>Cinéma &amp; Films 🎬</h5>
                                        {result.films.slice(0, 3).map(f => {
                                            const imgSrc = f.urlImage ? f.urlImage.split(',').filter(Boolean)[0] : null;
                                            return (
                                            <Link to={`/film/${f.id}`} key={f.id} className="rec-card text-decoration-none">
                                                {imgSrc ? (
                                                    <img src={imgSrc} alt={f.titre} className="rec-img" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                                                ) : null}
                                                <div className="rec-img-placeholder" style={{ display: imgSrc ? 'none' : 'flex' }}>🎬</div>
                                                <div className="rec-info">
                                                    <h4>{f.titre}</h4>
                                                    <p>{f.genre} • {f.langue}</p>
                                                </div>
                                            </Link>
                                            );
                                        })}
                                    </div>
                                )}

                                {result.showFollowUp !== false && (
                                    <div className="chat-msg msg-ai mt-4 pt-3 border-top border-secondary">
                                        <p>Souhaitez-vous ajouter d'autres plans pour le reste de vos vacances ? 😊</p>
                                        <div className="chatbot-options">
                                            <button className="option-btn" onClick={() => generatePlan(answers, true)}>Oui, avec plaisir !</button>
                                            <button className="option-btn" onClick={() => setResult({ ...result, showFollowUp: false })}>Non merci, c'est parfait</button>
                                        </div>
                                    </div>
                                )}

                                <button className="regenerate-btn" onClick={() => generatePlan(answers, true)}>
                                    <i className="bi bi-arrow-clockwise me-2"></i>
                                    Régénérer un autre plan
                                </button>
                                <button className="option-btn w-100 mt-2" onClick={resetChat}>
                                    Nouvelle recherche
                                </button>
                            </>
                        ) : (
                            renderQuestion()
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="chatbot-footer">
                        {step < QUESTIONS.length && !loading && !result && (
                            <>
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}></div>
                                </div>
                                <div className="progress-text">Question {step + 1} sur {QUESTIONS.length}</div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chatbot;
