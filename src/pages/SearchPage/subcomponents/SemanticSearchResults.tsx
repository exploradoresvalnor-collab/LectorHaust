/**
 * SemanticSearchIntegration
 * Integra búsqueda fuzzy con operadores avanzados en SearchPage
 */

import React, { useState, useEffect } from 'react';
import { IonIcon, IonChip, IonLabel } from '@ionic/react';
import { bulbOutline, trashOutline } from 'ionicons/icons';
import { useSemanticSearch } from '../../../hooks/useHausIntelligence';
import { mangaProvider } from '../../../services/mangaProvider';
import SmartImage from '../../../components/SmartImage';
import './styles-search-haus.css';

export interface SemanticSearchProps {
  allManga: any[];
  query: string;
  onResultClick: (manga: any) => void;
  showAdvancedHints?: boolean;
}

/**
 * Componente de búsqueda semántica integrado
 */
export const SemanticSearchResults: React.FC<SemanticSearchProps> = ({
  allManga,
  query,
  onResultClick,
  showAdvancedHints = true
}) => {
  const { searchResults, performSearch, advancedSearch, isIndexing } = useSemanticSearch(allManga);

  useEffect(() => {
    if (!query || query.trim().length === 0) return;

    // Detectar si usa operadores avanzados
    if (query.includes('!')) {
      advancedSearch(query, 40);
    } else {
      performSearch(query, 40);
    }
  }, [query, performSearch, advancedSearch]);

  // Mostrar hints de búsqueda avanzada
  const showHints = showAdvancedHints && query.length > 0 && !query.includes('!');

  return (
    <div className="semantic-search-results-container">
      {/* Advanced Search Hints */}
      {showHints && (
        <div className="semantic-search-hints">
          <div className="semantic-hint-item">
            <IonIcon icon={bulbOutline} className="semantic-hint-icon" />
            <span className="semantic-hint-text">
              💡 Intenta: <code>!yaoi {query}</code> para excluir yaoi
            </span>
          </div>
        </div>
      )}

      {/* Results Grid */}
      {searchResults.length > 0 ? (
        <div className="semantic-search-grid">
          {searchResults.map((manga: any) => {
            const title = mangaProvider.getLocalizedTitle(manga);
            const cover = mangaProvider.getCoverUrl(manga, '256');

            return (
              <div
                key={manga.id}
                className="semantic-result-card"
                onClick={() => onResultClick(manga)}
                role="button"
                tabIndex={0}
              >
                <div className="semantic-result-cover-wrapper">
                  <SmartImage
                    src={cover}
                    alt={title}
                    className="semantic-result-cover"
                    wrapperClassName="semantic-result-cover-img"
                    width={150}
                    height={225}
                    loading="lazy"
                  />

                  {/* Match Score */}
                  <div className="semantic-result-score">
                    {Math.round(manga._searchScore)}%
                  </div>

                  {/* Match Badges */}
                  {manga._matchedFields && manga._matchedFields.length > 0 && (
                    <div className="semantic-result-badges">
                      {manga._matchedFields.slice(0, 2).map((field: string, idx: number) => (
                        <span key={idx} className="semantic-badge">
                          {field === 'title' && '📖'}
                          {field === 'tags' && '🏷️'}
                          {field === 'description' && '📝'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="semantic-result-info">
                  <h3 className="semantic-result-title" title={title}>
                    {title.length > 25 ? `${title.substring(0, 22)}...` : title}
                  </h3>

                  {/* Score Bar */}
                  <div className="semantic-result-bar">
                    <div
                      className="semantic-result-bar-fill"
                      style={{ width: `${manga._searchScore}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : query.length > 0 ? (
        <div className="semantic-no-results">
          <p>❌ No se encontraron resultados para "{query}"</p>
          {showAdvancedHints && (
            <small>
              Intenta con menos palabras o usa palabras exactas
            </small>
          )}
        </div>
      ) : null}
    </div>
  );
};

/**
 * Chips de búsqueda rápida con sugerencias populares
 */
export const QuickSearchSuggestions: React.FC<{
  suggestions: string[];
  onSuggestionClick: (query: string) => void;
  onClear: () => void;
}> = ({ suggestions, onSuggestionClick, onClear }) => {
  return (
    <div className="semantic-quick-search">
      <div className="semantic-quick-title">
        <IonIcon icon={bulbOutline} />
        Búsquedas populares
      </div>

      <div className="semantic-quick-chips">
        {suggestions.map((suggestion, idx) => (
          <IonChip
            key={idx}
            onClick={() => onSuggestionClick(suggestion)}
            className="semantic-quick-chip"
          >
            <IonLabel>{suggestion}</IonLabel>
          </IonChip>
        ))}
      </div>
    </div>
  );
};

/**
 * Instrucciones de búsqueda avanzada
 */
export const AdvancedSearchTips: React.FC = () => {
  return (
    <div className="semantic-tips-container">
      <h3 className="semantic-tips-title">🎯 Búsqueda Inteligente</h3>

      <div className="semantic-tips-list">
        <div className="semantic-tip-item">
          <code className="semantic-tip-code">accion magia</code>
          <span className="semantic-tip-desc">Mangas con acción y magia</span>
        </div>

        <div className="semantic-tip-item">
          <code className="semantic-tip-code">!yaoi romance</code>
          <span className="semantic-tip-desc">Romance pero sin yaoi</span>
        </div>

        <div className="semantic-tip-item">
          <code className="semantic-tip-code">vampiros medieval</code>
          <span className="semantic-tip-desc">Busca tolerante a faltas de ortografía</span>
        </div>

        <div className="semantic-tip-item">
          <code className="semantic-tip-code">!shounen !shoujo seinen</code>
          <span className="semantic-tip-desc">Seinen pero no shounen ni shoujo</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Barra de búsqueda mejorada con hints inline
 */
export const EnhancedSearchbar: React.FC<{
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = 'Busca "accion magic" o intenta "!yaoi action"' }) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className={`semantic-searchbar-wrapper ${focused ? 'focused' : ''}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="semantic-searchbar-input"
        autoComplete="off"
      />

      {/* Character counter for advanced search */}
      {value.includes('!') && (
        <div className="semantic-searchbar-tip">
          ⚡ Búsqueda avanzada activa
        </div>
      )}

      {/* Clear button */}
      {value && (
        <button
          className="semantic-searchbar-clear"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
        >
          <IonIcon icon={trashOutline} />
        </button>
      )}
    </div>
  );
};

export default SemanticSearchResults;
