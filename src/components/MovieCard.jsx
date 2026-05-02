import React, { useState } from 'react';
import { getPosterUrl } from '../services/tmdb';
import { motion } from 'framer-motion';
import { Star, Play } from 'lucide-react';
import './MovieCard.css';

const MovieCard = React.memo(({ movie }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <motion.div 
      className="movie-card"
      whileHover={{ scale: 1.05, zIndex: 10 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {!imageLoaded && <div className="movie-card-skeleton" />}
      <picture>
        <source media="(max-width: 768px)" srcSet={getPosterUrl(movie.poster_path, 'w154')} />
        <img 
          src={getPosterUrl(movie.poster_path, 'w342')} 
          alt={movie.title || movie.name} 
          className={`movie-card-poster ${imageLoaded ? 'loaded' : 'loading'}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
        />
      </picture>
      <div className="movie-card-info">
        <div className="card-actions">
          <button className="play-btn-circle"><Play size={16} fill="black" /></button>
          <div className="card-rating">
            <Star size={12} fill="#46d369" color="#46d369" />
            <span>{movie.vote_average.toFixed(1)}</span>
          </div>
        </div>
        <h3 className="movie-card-title">{movie.title || movie.name}</h3>
        <div className="movie-card-meta">
          <span>{new Date(movie.release_date || movie.first_air_date).getFullYear()}</span>
          <span className="card-hd">4K</span>
        </div>
      </div>
    </motion.div>
  );
});

MovieCard.displayName = 'MovieCard';

export default MovieCard;
