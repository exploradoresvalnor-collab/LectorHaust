/**
 * EJEMPLO DE INTEGRACIÓN - Cómo usar las features de Haus Intelligence
 * Copiar y adaptar en los componentes reales
 */

import React, { useState, useEffect } from 'react';
import { usePersonalizedRecommendations, useReadingTracker, useSemanticSearch } from '../hooks/useHausIntelligence';
import { getRecommendationEngine } from '../services/recommendationEngine';

// ============================================================================
// EJEMPLO 1: Usar Recomendaciones Personalizadas
// ============================================================================

export function RecommendationsExample({ mangaList }: { mangaList: any[] }) {
    const { recommendations, loading } = usePersonalizedRecommendations(mangaList, 12);

    if (loading) return <div>Generando recomendaciones personalizadas...</div>;

    return (
        <div style={{ padding: '20px' }}>
            <h2>🎯 Recomendado Para Ti</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                {recommendations.map(manga => (
                    <div key={manga.id} style={{ 
                        border: '1px solid #ddd', 
                        padding: '10px',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}>
                        <img 
                            src={manga.attributes?.coverUrl} 
                            alt={manga.attributes?.title}
                            style={{ width: '100%', borderRadius: '4px' }}
                        />
                        <p style={{ fontWeight: 'bold' }}>
                            {typeof manga.attributes?.title === 'string' 
                                ? manga.attributes.title 
                                : manga.attributes?.title?.es || manga.attributes?.title?.en}
                        </p>
                        
                        {/* Mostrar por qué se recomienda */}
                        {manga._recommendationReason && manga._recommendationReason.length > 0 && (
                            <small style={{ color: '#666' }}>
                                💡 {manga._recommendationReason[0]}
                            </small>
                        )}
                        
                        {/* Score visual */}
                        <div style={{ 
                            marginTop: '8px',
                            width: `${Math.min(manga._recommendationScore, 100)}%`,
                            height: '4px',
                            backgroundColor: '#4CAF50',
                            borderRadius: '2px'
                        }} />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// EJEMPLO 2: Usar Reading Tracker (Continuar Leyendo)
// ============================================================================

export function ContinueReadingExample() {
    const { continueReading, stats, startReading, updateProgress, completeChapter } = useReadingTracker();

    return (
        <div style={{ padding: '20px' }}>
            <h2>📖 Continuar Leyendo</h2>

            {/* Estadísticas */}
            {stats && (
                <div style={{ 
                    backgroundColor: '#f5f5f5', 
                    padding: '15px', 
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <p>📚 Capítulos leídos: <strong>{stats.totalChaptersRead}</strong></p>
                    <p>⏱️ Tiempo total: <strong>{stats.totalTimeSpentMinutes} minutos</strong></p>
                    <p>🔥 Racha: <strong>{stats.readingStreak} días</strong></p>
                    {stats.isReadingToday && <p style={{ color: 'green' }}>✅ Leíste hoy</p>}
                </div>
            )}

            {/* Lista de continuación */}
            <h3>Retomar desde donde dejaste:</h3>
            {continueReading.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {continueReading.map(item => (
                        <div 
                            key={item.chapterId}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px',
                                border: '1px solid #ddd',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            <div>
                                <p style={{ fontWeight: 'bold' }}>{item.mangaTitle}</p>
                                <small>Capítulo {item.chapterNumber} - Página {item.pageNumber}/{item.totalPages}</small>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{
                                    width: '100px',
                                    height: '6px',
                                    backgroundColor: '#e0e0e0',
                                    borderRadius: '3px',
                                    overflow: 'hidden',
                                    marginBottom: '5px'
                                }}>
                                    <div style={{
                                        width: `${item.progressPercent}%`,
                                        height: '100%',
                                        backgroundColor: '#2196F3',
                                        transition: 'width 0.3s'
                                    }} />
                                </div>
                                <small>{item.progressPercent}%</small>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p style={{ color: '#999' }}>No hay mangas en progreso. ¡Comienza a leer!</p>
            )}
        </div>
    );
}

// ============================================================================
// EJEMPLO 3: Buscar con Semantic Search
// ============================================================================

export function SemanticSearchExample({ mangaList }: { mangaList: any[] }) {
    const [query, setQuery] = useState('');
    const { searchResults, performSearch, advancedSearch } = useSemanticSearch(mangaList);

    const handleSearch = (q: string) => {
        setQuery(q);
        if (q.includes('!')) {
            // Si hay operadores, usar advanced search
            advancedSearch(q, 20);
        } else {
            performSearch(q, 20);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2>🔍 Búsqueda Inteligente</h2>
            
            <div style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Busca 'accion magia' o intenta '!yaoi action'"
                    style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: '16px',
                        border: '2px solid #2196F3',
                        borderRadius: '6px'
                    }}
                />
                <small style={{ color: '#666', marginTop: '8px', display: 'block' }}>
                    Búsqueda tolerante a faltas de ortografía. Usa !género para excluir géneros.
                </small>
            </div>

            {/* Resultados */}
            {searchResults.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                    {searchResults.map(manga => (
                        <div 
                            key={manga.id}
                            style={{
                                border: '1px solid #ddd',
                                padding: '10px',
                                borderRadius: '6px'
                            }}
                        >
                            <img 
                                src={manga.attributes?.coverUrl}
                                alt={manga.attributes?.title}
                                style={{ width: '100%', borderRadius: '4px' }}
                            />
                            <p style={{ fontWeight: 'bold', marginTop: '8px' }}>
                                {typeof manga.attributes?.title === 'string'
                                    ? manga.attributes.title
                                    : manga.attributes?.title?.es || manga.attributes?.title?.en}
                            </p>
                            <small style={{ color: '#666' }}>
                                Coincidencia: {manga._matchedFields.join(', ')}
                            </small>
                        </div>
                    ))}
                </div>
            ) : query.length > 0 ? (
                <p style={{ color: '#999' }}>No se encontraron resultados para "{query}"</p>
            ) : (
                <p style={{ color: '#999' }}>Escribe para buscar...</p>
            )}
        </div>
    );
}

// ============================================================================
// EJEMPLO 4: Logging de lecturas (integración con página de detalles)
// ============================================================================

export function MangaDetailsIntegration({ manga }: { manga: any }) {
    const engine = getRecommendationEngine();
    const { startReading } = useReadingTracker();
    const [userRating, setUserRating] = useState(3);

    const handleMarkAsRead = () => {
        const tags = (manga.attributes?.tags || [])
            .map((t: any) => t.attributes?.name?.en || '')
            .filter(Boolean);

        // Log the reading with rating
        engine.logReading(manga.id, userRating, 1);

        // Update genre preferences
        engine.updateGenrePreferences(manga.id, tags, userRating);

        alert(`✅ Marcado como leído (${userRating}/5 ⭐)`);
    };

    return (
        <div style={{ padding: '20px' }}>
            <h3>¿Te gustó este manga?</h3>
            
            <div style={{ marginBottom: '15px' }}>
                <label>Calificación: </label>
                <div style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                        <button
                            key={star}
                            onClick={() => setUserRating(star)}
                            style={{
                                fontSize: '24px',
                                border: 'none',
                                backgroundColor: star <= userRating ? '#FFD700' : '#ccc',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                padding: '5px 10px'
                            }}
                        >
                            ⭐
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={handleMarkAsRead}
                style={{
                    padding: '12px 20px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '16px'
                }}
            >
                ✅ Marcar como Leído
            </button>
        </div>
    );
}

// ============================================================================
// EJEMPLO 5: Dashboard con múltiples features
// ============================================================================

export function HausIntelligenceDashboard({ mangaList }: { mangaList: any[] }) {
    const engine = getRecommendationEngine();
    const [userStats, setUserStats] = useState<any>(null);

    useEffect(() => {
        setUserStats(engine.getStats());
    }, [engine]);

    return (
        <div style={{ padding: '40px' }}>
            <h1>🏠 Haus Intelligence Dashboard</h1>

            {/* Perfil del usuario */}
            {userStats && (
                <div style={{
                    backgroundColor: '#f0f4ff',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '30px'
                }}>
                    <h2>Tu Perfil</h2>
                    <p>📚 Mangas leídos: <strong>{userStats.totalRead}</strong></p>
                    <p>⭐ Calificación promedio: <strong>{userStats.avgRating}</strong></p>
                    <p>❤️ Géneros favoritos: <strong>{userStats.topGenres.join(', ')}</strong></p>
                    <p>🔥 Racha actual: <strong>{userStats.readingStreak} días</strong></p>
                </div>
            )}

            {/* Secciones principales */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                <RecommendationsExample mangaList={mangaList} />
                <ContinueReadingExample />
            </div>

            <hr style={{ margin: '40px 0' }} />

            <SemanticSearchExample mangaList={mangaList} />
        </div>
    );
}

export default HausIntelligenceDashboard;
