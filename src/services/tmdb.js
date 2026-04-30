const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

// Tamanhos otimizados para performance:
// - Hero backdrop: w1280 (suficiente para tela cheia, ~70% menor que 'original')
// - Poster cards: w342 (boa qualidade para cards, ~40% menor que w500)
const BACKDROP_URL = 'https://image.tmdb.org/t/p/w1280';
const POSTER_URL = 'https://image.tmdb.org/t/p/w342';

export const getImageUrl = (path) => path ? `${BACKDROP_URL}${path}` : '';
export const getPosterUrl = (path) => path ? `${POSTER_URL}${path}` : '';

// Cache de API em memória para evitar chamadas duplicadas
const apiCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

export const fetchMovies = async (endpoint) => {
  try {
    // Verifica se há cache válido
    const cached = apiCache.get(endpoint);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      return cached.data;
    }

    const response = await fetch(`${BASE_URL}${endpoint}?api_key=${API_KEY}&language=pt-BR`);
    if (!response.ok) throw new Error('Failed to fetch from TMDB');
    const data = await response.json();
    
    // Salva no cache
    apiCache.set(endpoint, { data: data.results, timestamp: Date.now() });
    
    return data.results;
  } catch (error) {
    console.error('TMDB Error:', error);
    // Retorna cache expirado se houver erro de rede
    const staleCache = apiCache.get(endpoint);
    if (staleCache) return staleCache.data;
    return [];
  }
};

// Pré-carrega uma imagem no browser cache
export const preloadImage = (url) => {
  if (!url) return;
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = 'image';
  link.href = url;
  document.head.appendChild(link);
};

export const tmdbApi = {
  getTrending: () => fetchMovies('/trending/movie/week'),
  getUpcoming: () => fetchMovies('/movie/upcoming'),
  getPopular: () => fetchMovies('/movie/popular'),
  getTopRated: () => fetchMovies('/movie/top_rated'),
  getNowPlaying: () => fetchMovies('/movie/now_playing'),
  getSeries: () => fetchMovies('/tv/popular'),
};
