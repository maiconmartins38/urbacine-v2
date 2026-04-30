import React, { useState, useEffect, useRef, useCallback } from 'react';
import MovieCard from './MovieCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './MovieRow.css';

const MovieRow = React.memo(({ title, fetchFn, autoPlay = true }) => {
  const [movies, setMovies] = useState([]);
  const rowRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const loadMovies = async () => {
      const data = await fetchFn();
      if (!cancelled) setMovies(data);
    };
    loadMovies();
    return () => { cancelled = true; };
  }, [fetchFn]);

  // Auto-scrolling logic
  useEffect(() => {
    if (!autoPlay || movies.length === 0) return;

    const interval = setInterval(() => {
      if (rowRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
        const maxScroll = scrollWidth - clientWidth;
        
        if (scrollLeft >= maxScroll - 10) {
          rowRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          rowRef.current.scrollTo({ left: scrollLeft + 300, behavior: 'smooth' });
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [autoPlay, movies]);

  const scroll = useCallback((direction) => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === 'left' 
        ? scrollLeft - clientWidth * 0.8 
        : scrollLeft + clientWidth * 0.8;
      
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  }, []);

  if (movies.length === 0) return null;

  return (
    <div className="movie-row-container">
      <div className="row-header">
        <h2 className="row-title">{title}</h2>
      </div>
      
      <div className="row-wrapper">
        <button className="row-nav nav-left" onClick={() => scroll('left')} aria-label="Anterior">
          <ChevronLeft size={32} />
        </button>
        
        <div className="movie-row" ref={rowRef}>
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>

        <button className="row-nav nav-right" onClick={() => scroll('right')} aria-label="Próximo">
          <ChevronRight size={32} />
        </button>
      </div>
    </div>
  );
});

MovieRow.displayName = 'MovieRow';

export default MovieRow;
