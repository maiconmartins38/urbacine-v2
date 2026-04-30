import React, { useState, useEffect, useCallback } from 'react';
import { Play, Info } from 'lucide-react';
import { tmdbApi, getImageUrl, preloadImage } from '../services/tmdb';
import { motion, AnimatePresence } from 'framer-motion';
import './Hero.css';

const Hero = ({ scrollToSection }) => {
  const [movies, setMovies] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHeroData = async () => {
      const data = await tmdbApi.getNowPlaying();
      if (data.length > 0) {
        const heroMovies = data.slice(0, 8); // 8 filmes (reduzido de 10 para menos consumo)
        setMovies(heroMovies);
        
        // Pré-carrega as 3 primeiras imagens imediatamente
        heroMovies.slice(0, 3).forEach(m => {
          if (m.backdrop_path) preloadImage(getImageUrl(m.backdrop_path));
        });
      }
      setLoading(false);
    };

    fetchHeroData();
  }, []);

  // Pré-carrega a próxima imagem antes da transição
  const preloadNext = useCallback((idx) => {
    const nextIdx = (idx + 1) % movies.length;
    const nextMovie = movies[nextIdx];
    if (nextMovie?.backdrop_path) {
      preloadImage(getImageUrl(nextMovie.backdrop_path));
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
    }, 5000);

    return () => clearInterval(interval);
  }, [movies, preloadNext]);

  if (loading || movies.length === 0) return <div className="hero-skeleton"></div>;

  const movie = movies[currentIndex];

  return (
    <div className="hero">
      <AnimatePresence mode="wait">
        <motion.div 
          key={movie.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="hero-background"
        >
          <img 
            src={getImageUrl(movie.backdrop_path)} 
            alt={movie.title} 
            className="hero-image"
            fetchPriority="high"
          />
          <div className="hero-overlay-v"></div>
          <div className="hero-overlay-h"></div>
        </motion.div>
      </AnimatePresence>

      <div className="container hero-content-wrapper">
        <AnimatePresence mode="wait">
          <motion.div 
            key={movie.id}
            className="hero-content"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.6 }}
          >
            <div className="hero-badge">
              <span>STREAMING AO VIVO | FILMES | SÉRIES</span>
            </div>
            
            <h1 className="hero-title">{movie.title}</h1>
            
            <div className="hero-meta">
              <span className="rating">{movie.vote_average.toFixed(1)} Classificação</span>
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
              >
                <Play size={20} fill="currentColor" />
                <span>Assista Agora</span>
              </button>
              <button className="btn btn-secondary">
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
