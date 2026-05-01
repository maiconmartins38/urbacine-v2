import React, { useState, useEffect, useRef, useCallback } from 'react';
import MovieCard from './MovieCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './MovieRow.css';

const MovieRow = React.memo(({ title, fetchFn, autoPlay = true }) => {
  const [movies, setMovies] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const rowRef = useRef(null);
  const containerRef = useRef(null);

  // Intersection Observer to detect visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Começa a carregar 200px antes de aparecer
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let cancelled = false;
    const loadMovies = async () => {
      try {
        const data = await fetchFn();
        if (!cancelled) setMovies(data);
      } catch (error) {
        console.error("Erro ao carregar filmes:", error);
      }
    };
    loadMovies();
    return () => { cancelled = true; };
  }, [fetchFn, isVisible]);

  // Auto-scrolling logic
  useEffect(() => {
    if (!autoPlay || movies.length === 0 || !isVisible) return;

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
    }, 6000); // Aumentado para 6s para menos processamento

    return () => clearInterval(interval);
  }, [autoPlay, movies, isVisible]);

  const scroll = useCallback((direction) => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === 'left' 
        ? scrollLeft - clientWidth * 0.8 
        : scrollLeft + clientWidth * 0.8;
      
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="movie-row-container" ref={containerRef} style={{ minHeight: '200px' }}>
      <div className="row-header">
        <h2 className="row-title">{title}</h2>
      </div>
      
      <div className="row-wrapper">
        {movies.length > 0 && (
          <>
            <button className="row-nav nav-left" onClick={() => scroll('left')} aria-label="Ver filmes anteriores">
              <ChevronLeft size={32} />
            </button>
            
            <div className="movie-row" ref={rowRef}>
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>

            <button className="row-nav nav-right" onClick={() => scroll('right')} aria-label="Ver mais filmes">
              <ChevronRight size={32} />
            </button>
          </>
        )}
        {movies.length === 0 && isVisible && <div className="row-skeleton" />}
      </div>
    </div>
  );
});

MovieRow.displayName = 'MovieRow';

export default MovieRow;

