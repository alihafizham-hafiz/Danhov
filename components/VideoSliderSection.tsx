'use client';

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import Image from 'next/image';

import 'swiper/css';
import 'swiper/css/navigation';

export default function HeroCarousel() {
  const slides = [
    { id: 1, image: '/Vedios/image_1.png', alt: 'Icons of Summer 1' },
    { id: 2, image: '/Vedios/image_2.png', alt: 'Icons of Summer 2' },
    { id: 3, image: '/Vedios/image_3.png', alt: 'Icons of Summer 3' },
    { id: 4, image: '/Vedios/image_4.png', alt: 'Icons of Summer 4' },
    { id: 5, image: '/Vedios/image_5.png', alt: 'Icons of Summer 5' },
    { id: 6, image: '/Vedios/image_6.png', alt: 'Icons of Summer 6' },
  ];

  return (
    <section className="hero-carousel-section w-full bg-white pt-16 pb-16 md:pt-24 md:pb-24">
      {/* Heading spacing */}
      <div className="mb-12 md:mb-20 text-center">
        <h2 className="head_icon_summery text-[24px] md:text-[32px] font-normal tracking-wide text-[#111] font-serif">
          Icons of Summer
        </h2>
      </div>

      <div className="relative w-full overflow-hidden">
        <Swiper
          modules={[Navigation]}
          centeredSlides
          slidesPerView="auto"
          spaceBetween="10%"
          loop
          navigation={{
            nextEl: '.editorial-next',
            prevEl: '.editorial-prev',
          }}
          className="luxury-editorial-swiper !overflow-visible"
        >
          {slides.map((slide) => (
            <SwiperSlide
              key={slide.id}
              className="editorial-slide !w-[88vw] md:!w-[64%] transition-opacity duration-500"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#f4f4f4]">
                <Image
                  src={slide.image}
                  alt={slide.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 90vw, 64vw"
                  priority
                />

                <div className="absolute bottom-4 right-4 z-10 flex items-center gap-[3px] bg-black/30 px-2 py-1.5">
                  <span className="block h-2.5 w-[1.5px] bg-white" />
                  <span className="block h-2.5 w-[1.5px] bg-white" />
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Prev arrow — centered in the left gap, computed from slide width not a guessed % */}
        <button
          type="button"
          className="editorial-prev absolute left-0 w-[19%] md:w-[18%] top-1/2 z-20 -translate-y-1/2 flex justify-center items-center h-14 text-[#333] transition-all duration-200"
          aria-label="Previous slide"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        {/* Next arrow — centered in the right gap */}
        <button
          type="button"
          className="editorial-next absolute right-0 w-[19%] md:w-[18%] top-1/2 z-20 -translate-y-1/2 flex justify-center items-center h-14 text-[#333] transition-all duration-200"
          aria-label="Next slide"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        <button
          type="button"
          className="absolute bottom-4 right-4 md:right-6 z-30 flex h-8 w-8 items-center justify-center text-white"
          aria-label="Toggle sound"
        >
          <svg width="16" height="16" viewBox="0 0 
          24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19 5a13 13 0 010 14M15.5 8.5a7 7 0 010 7" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </section>
  );
}