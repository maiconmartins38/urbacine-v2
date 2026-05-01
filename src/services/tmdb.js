const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Tamanhos disponíveis no TMDB: 
// Backdrop: w300, w780, w1280, original
// Poster: w92, w154, w185, w342, w500, w780, original

export const getImageUrl = (path, size = 'w1280') => {
  if (!path) return '';
  // Se for mobile, força um tamanho menor para backdrop se não especificado
  const finalSize = (size === 'w1280' && window.innerWidth < 768) ? 'w780' : size;
  return `${IMAGE_BASE_URL}/${finalSize}${path}`;
};

export const getPosterUrl = (path, size = 'w342') => {
  if (!path) return '';
  // Para mobile cards, w185 é suficiente e muito mais leve
  const finalSize = (size === 'w342' && window.innerWidth < 768) ? 'w185' : size;
  return `${IMAGE_BASE_URL}/${finalSize}${path}`;
};

// Cache de API em memória para evitar chamadas duplicadas
const apiCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

export const fetchMovies = async (endpoint) => {
  try {
    const cached = apiCache.get(endpoint);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      return cached.data;
    }

    const response = await fetch(`${BASE_URL}${endpoint}?api_key=${API_KEY}&language=pt-BR`);
    if (!response.ok) throw new Error('Failed to fetch from TMDB');
    const data = await response.json();
    
    apiCache.set(endpoint, { data: data.results, timestamp: Date.now() });
    return data.results;
  } catch (error) {
    console.error('TMDB Error:', error);
    const staleCache = apiCache.get(endpoint);
    if (staleCache) return staleCache.data;
    return [];
  }
};

// Pré-carrega uma imagem no browser cache
export const preloadImage = (url) => {
  if (!url || typeof document === 'undefined') return;
  const link = document.createElement('link');
  link.rel = 'preload';
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

