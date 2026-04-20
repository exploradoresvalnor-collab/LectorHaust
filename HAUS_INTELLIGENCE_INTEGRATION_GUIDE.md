# 🏠 Haus Intelligence v4 - Guía de Integración

**Fecha de creación**: 19 de Abril de 2026  
**Estado**: ✅ Completamente implementado (listo para integración)

---

## 📦 Qué se creó

### **Servicios Core**
1. **`src/services/recommendationEngine.ts`** - Motor de recomendaciones personalizadas
2. **`src/services/readingTracker.ts`** - Rastreador de progreso de lectura
3. **`src/services/semanticSearch.ts`** - Búsqueda fuzzy sin dependencias

### **React Hooks**
4. **`src/hooks/useHausIntelligence.ts`** - Hooks listos para usar en componentes

### **Componentes de Integración**
5. **`src/pages/HomePage/subcomponents/RecommendationGrid.tsx`** - Recomendaciones en home
6. **`src/pages/SearchPage/subcomponents/SemanticSearchResults.tsx`** - Búsqueda mejorada
7. **`src/pages/ReaderPage/subcomponents/ReaderHausIntegration.tsx`** - Tracking en lector
8. **`src/pages/LibraryPage/subcomponents/HausLibraryIntegration.tsx`** - "Continuar leyendo"

### **Ejemplos de Uso**
9. **`src/components/HausIntelligenceExamples.tsx`** - Componentes de ejemplo completos

---

## 🚀 Cómo integrar en 4 pasos

### **Paso 1: HomePage - Mostrar Recomendaciones**

En `src/pages/HomePage/index.tsx`:

```typescript
import { RecommendationGrid } from './subcomponents/RecommendationGrid';

const HomePage: React.FC = () => {
  // ... código existente ...
  
  return (
    <IonPage>
      {/* ... header, hero grid, etc ... */}
      
      {/* AGREGAR AQUÍ */}
      <RecommendationGrid 
        allManga={latestManga}
        onMangaClick={(manga) => {
          hapticsService.lightImpact();
          router.push(`/manga/${manga.id}`);
        }}
        limit={12}
      />
      
      {/* ... resto del contenido ... */}
    </IonPage>
  );
};
```

### **Paso 2: SearchPage - Búsqueda Semántica**

En `src/pages/SearchPage/index.tsx`:

```typescript
import { SemanticSearchResults, EnhancedSearchbar, AdvancedSearchTips } from './subcomponents/SemanticSearchResults';

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  
  // ... código existente ...
  
  return (
    <IonPage>
      {/* Reemplazar searchbar existente con: */}
      <EnhancedSearchbar 
        value={query}
        onChange={(q) => {
          setQuery(q);
          handleSearch(q); // Tu función existente
        }}
      />

      {/* Mostrar hints si no hay resultados del API */}
      {results.length === 0 && query.length > 0 && (
        <>
          <SemanticSearchResults 
            allManga={allManga} // Tus mangas cargados
            query={query}
            onResultClick={(manga) => router.push(`/manga/${manga.id}`)}
            showAdvancedHints={true}
          />
          <AdvancedSearchTips />
        </>
      )}
    </IonPage>
  );
};
```

### **Paso 3: ReaderPage - Tracking Automático**

En `src/pages/ReaderPage/index.tsx`:

```typescript
import { ReaderHausIntegration } from './subcomponents/ReaderHausIntegration';

const ReaderPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(0);
  // ... código existente ...
  
  return (
    <IonPage className="reader-page">
      {/* Tu contenido de lectura existente */}
      <ImageGallery 
        images={images}
        onPageChange={setCurrentPage}
        // ...
      />
      
      {/* AGREGAR AL FINAL */}
      <ReaderHausIntegration
        mangaId={mangaId}
        mangaTitle={mangaTitle}
        chapterId={chapterId}
        chapterNumber={chapterNumber}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onChapterComplete={() => {
          // Opcional: hacer algo cuando termina el capítulo
        }}
      />
    </IonPage>
  );
};
```

### **Paso 4: LibraryPage - Continuar Leyendo**

En `src/pages/LibraryPage/index.tsx`:

```typescript
import { ContinueReadingCard, ReadingStatsCard, ReadingStreakBanner } from './subcomponents/HausLibraryIntegration';

const LibraryPage: React.FC = () => {
  // ... código existente ...
  
  return (
    <IonPage>
      <IonContent>
        {/* Agregar racha al inicio */}
        <ReadingStreakBanner />
        
        {/* Mostrar estadísticas */}
        <ReadingStatsCard />
        
        {/* Continuar leyendo */}
        <ContinueReadingCard 
          onItemClick={(item) => {
            router.push(`/manga/${item.mangaId}/chapter/${item.chapterId}`);
          }}
          limit={8}
        />
        
        {/* ... tu contenido de biblioteca existente ... */}
      </IonContent>
    </IonPage>
  );
};
```

---

## 🎯 Cómo loguear lecturas (en MangaDetailsPage)

```typescript
import { getRecommendationEngine } from '../../services/recommendationEngine';

const MangaDetailsPage: React.FC = () => {
  const engine = getRecommendationEngine();
  const [userRating, setUserRating] = useState(3);
  
  const handleMarkAsRead = () => {
    // Obtener tags del manga
    const tags = (manga.attributes?.tags || [])
      .map((t: any) => t.attributes?.name?.en || '')
      .filter(Boolean);
    
    // Log de lectura
    engine.logReading(manga.id, userRating, 1, tags);
    
    // Actualizar preferencias
    engine.updateGenrePreferences(manga.id, tags, userRating);
    
    alert(`✅ Marcado como leído (${userRating}/5 ⭐)`);
  };
  
  return (
    <div>
      {/* ... detalles del manga ... */}
      
      {/* Selector de rating */}
      <div style={{ marginTop: '20px' }}>
        <label>¿Te gustó?</label>
        <div style={{ display: 'flex', gap: '5px' }}>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setUserRating(star)}
              style={{
                fontSize: '24px',
                background: star <= userRating ? '#FFD700' : '#ccc',
                border: 'none',
                padding: '8px',
                cursor: 'pointer'
              }}
            >
              ⭐
            </button>
          ))}
        </div>
      </div>
      
      <button onClick={handleMarkAsRead} style={{ marginTop: '10px' }}>
        Marcar como leído
      </button>
    </div>
  );
};
```

---

## 💾 Datos que se guardan automáticamente

Todo se persiste en `localStorage`:

```javascript
// Recomendaciones
localStorage.getItem('mangaApp_userProfile')

// Lectura
localStorage.getItem('mangaApp_readingSessions')

// Búsqueda
localStorage.getItem('mangaApp_searchIndex')
```

### Limpiar datos (si es necesario):
```typescript
const engine = getRecommendationEngine();
engine.reset();

const tracker = getReadingTracker();
tracker.clearAllSessions();

const search = getSemanticSearch();
search.clearIndex();
```

---

## 🔌 APIs disponibles

### Recomendaciones
```typescript
import { getRecommendationEngine } from '@/services/recommendationEngine';

const engine = getRecommendationEngine();

// Loguear lectura
engine.logReading(mangaId, rating, chaptersRead, tags);

// Obtener recomendaciones
engine.getRecommendations(mangaList, limit);

// Estadísticas
engine.getStats(); // { totalRead, avgRating, topGenres, readingStreak, ... }
```

### Lectura
```typescript
import { getReadingTracker } from '@/services/readingTracker';

const tracker = getReadingTracker();

// Iniciar sesión
tracker.startReading(mangaId, title, chapterId, chapterNumber, totalPages);

// Actualizar progreso
tracker.updateProgress(chapterId, pageNumber, totalPages);

// Completar capítulo
tracker.completeChapter(chapterId);

// Obtener datos
tracker.getContinueReading(limit);
tracker.getStats();
tracker.getMangaProgress(mangaId);
```

### Búsqueda Semántica
```typescript
import { getSemanticSearch } from '@/services/semanticSearch';

const search = getSemanticSearch();

// Construir índice
search.buildIndex(mangaList);

// Buscar normal
search.search('accion magia', 20);

// Búsqueda avanzada (con operadores)
search.advancedSearch('!yaoi action', 20);
// Resultado: Action sin yaoi
```

---

## 🎨 Personalización

### Cambiar colores
Todos los estilos usan variables de gradiente:
```css
/* En los archivos CSS */
background: linear-gradient(135deg, #667eea, #764ba2);
```

Cambiar `#667eea` y `#764ba2` por tus colores:

```css
/* Ejemplo: Cambiar a azul y cyan */
background: linear-gradient(135deg, #00a8e8, #00d4ff);
```

### Cambiar límites
```typescript
// En RecommendationGrid
<RecommendationGrid limit={15} /> {/* Default: 12 */}

// En ContinueReadingCard
<ContinueReadingCard limit={10} /> {/* Default: 8 */}
```

---

## 📊 Próximas características opcionales

1. **Cloud Sync** - Guardar en backend
   ```typescript
   engine.syncToCloud(userId); // Disponible en la API
   ```

2. **Badges/Achievements**
   ```typescript
   // "100 capítulos leídos", "7 días seguidos", etc.
   ```

3. **Leaderboards**
   ```typescript
   // Top mangas de la semana, usuarios con más racha, etc.
   ```

4. **Social Sharing**
   ```typescript
   // "Completé X capítulos", "Tengo racha de 7 días"
   ```

---

## 🐛 Debugging

### Ver estadísticas del usuario
```typescript
const engine = getRecommendationEngine();
console.log(engine.getStats());
```

### Ver sesiones de lectura
```typescript
const tracker = getReadingTracker();
console.log(tracker.getStats());
```

### Ver índice de búsqueda
```typescript
const search = getSemanticSearch();
console.log(search.getStats());
```

---

## ✅ Checklist de Integración

- [ ] Copiar los 3 servicios a `src/services/`
- [ ] Copiar hooks a `src/hooks/`
- [ ] Copiar componentes de integración a sus respectivas páginas
- [ ] Copiar CSS a los subcomponentes
- [ ] Integrar en HomePage (RecommendationGrid)
- [ ] Integrar en SearchPage (SemanticSearchResults)
- [ ] Integrar en ReaderPage (ReaderHausIntegration)
- [ ] Integrar en LibraryPage (HausLibraryIntegration + Stats)
- [ ] Añadir logging en MangaDetailsPage
- [ ] Probar en localhost
- [ ] Verificar localStorage con DevTools
- [ ] Deploy

---

## 📞 Soporte

Si algo no funciona:

1. **Verificar imports** - Asegúrate de que las rutas sean correctas
2. **Console errors** - Abre DevTools y busca errores
3. **localStorage** - Limpia y recarga: `localStorage.clear()`
4. **Hooks** - Verifica que los hooks usen las rutas correctas

---

**Implementado con ❤️ - Haus Intelligence v4**
