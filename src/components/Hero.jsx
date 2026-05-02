import React, { useState, useEffect, useCallback } from 'react';
import { Play, Info } from 'lucide-react';
import { tmdbApi, getImageUrl, preloadImage } from '../services/tmdb';
import { motion, AnimatePresence } from 'framer-motion';
import './Hero.css';

const Hero = ({ scrollToSection }) => {
  const [movies, setMovies] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // We no longer need isMobile state because we use CSS <picture> tag!

  useEffect(() => {
    const fetchHeroData = async () => {
      const data = await tmdbApi.getNowPlaying();
      if (data.length > 0) {
        const heroMovies = data.slice(0, 5); 
        setMovies(heroMovies);
        
        // Pré-carrega a primeira imagem com o tamanho ideal
        if (heroMovies[0]?.backdrop_path) {
          const firstImageUrl = getImageUrl(heroMovies[0].backdrop_path, window.innerWidth < 768 ? 'w780' : 'w1280');
          preloadImage(firstImageUrl);
        }
      }
      setLoading(false);
    };

    fetchHeroData();
  }, []);

  const preloadNext = useCallback((idx) => {
    const nextIdx = (idx + 1) % movies.length;
    const nextMovie = movies[nextIdx];
    if (nextMovie?.backdrop_path) {
      preloadImage(getImageUrl(nextMovie.backdrop_path, window.innerWidth < 768 ? 'w780' : 'w1280'));
    }
  }, [movies]);

  useEffect(() => {
    if (movies.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const newIndex = (prevIndex + 1) % movies.length;
        preloadNext(newIndex);
        return newIndex;
      });
    }, 6000); // Aumentado para 6s para menos interrupções

    return () => clearInterval(interval);
  }, [movies, preloadNext]);

  if (loading || movies.length === 0) return <div className="hero-skeleton"></div>;

  const movie = movies[currentIndex];

  return (
    <div className="hero">
      <AnimatePresence mode="wait">
        <motion.div 
          key={movie.id}
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="hero-background"
        >
          <picture>
            <source media="(max-width: 768px)" srcSet={getImageUrl(movie.backdrop_path, 'w780')} />
            <img 
              src={getImageUrl(movie.backdrop_path, 'w1280')} 
              alt={`Banner do filme ${movie.title}`} 
              className="hero-image"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
          <div className="hero-overlay-v"></div>
          <div className="hero-overlay-h"></div>
        </motion.div>
      </AnimatePresence>

      <div className="container hero-content-wrapper">
        <AnimatePresence mode="wait">
          <motion.div 
            key={movie.id}
            className="hero-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <div className="hero-badge">
              <span>STREAMING AO VIVO | FILMES | SÉRIES</span>
            </div>
            
            <h1 className="hero-title">{movie.title}</h1>
            
            <div className="hero-meta">
              <span className="rating" aria-label={`Avaliação: ${movie.vote_average.toFixed(1)}`}>
                {movie.vote_average.toFixed(1)} Classificação
              </span>
              <span className="year">{new Date(movie.release_date).getFullYear()}</span>
              <span className="quality">4K Ultra HD</span>
            </div>

            <p className="hero-overview">
              {movie.overview.length > 200 
                ? movie.overview.substring(0, 200) + '...' 
                : movie.overview}
            </p>

            <div className="hero-buttons">
              <button 
                onClick={() => scrollToSection('mensalidade')} 
                className="btn btn-primary"
                aria-label="Começar a assistir agora"
              >
                <Play size={20} fill="currentColor" />
                <span>Assista Agora</span>
              </button>
              <button 
                className="btn btn-secondary"
                aria-label="Ver detalhes do filme"
              >
                <Info size={20} />
                <span>Saiba Mais</span>
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Hero;

