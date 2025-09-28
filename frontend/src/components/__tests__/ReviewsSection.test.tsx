import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReviewsSection from '../ReviewsSection';
import { PlaceReview } from '@/types';

// Mock review data
const mockReviews: PlaceReview[] = [
  {
    authorName: 'John Doe',
    authorUrl: 'https://example.com/john',
    language: 'en',
    profilePhotoUrl: 'https://example.com/photo1.jpg',
    rating: 5,
    relativeTimeDescription: '2 weeks ago',
    text: 'Amazing place! Highly recommend visiting. The architecture is stunning and the staff is very friendly.',
    time: 1640995200
  },
  {
    authorName: 'Jane Smith',
    language: 'en',
    rating: 4,
    relativeTimeDescription: '1 month ago',
    text: 'Great experience overall. A bit crowded but worth the visit.',
    time: 1638316800
  },
  {
    authorName: 'Bob Johnson',
    authorUrl: 'https://example.com/bob',
    language: 'en',
    profilePhotoUrl: 'https://example.com/photo2.jpg',
    rating: 3,
    relativeTimeDescription: '3 months ago',
    text: 'Decent place, nothing special though.',
    time: 1633132800
  },
  {
    authorName: 'Alice Brown',
    language: 'en',
    rating: 5,
    relativeTimeDescription: '6 months ago',
    text: 'Absolutely loved it! Will definitely come back.',
    time: 1625097600
  }
];

describe('ReviewsSection', () => {
  it('renders overall rating and review count correctly', () => {
    render(
      <ReviewsSection 
        reviews={mockReviews} 
        rating={4.3} 
        totalReviews={1250} 
      />
    );

    const ratingElements = screen.getAllByText('4.3');
    expect(ratingElements).toHaveLength(2); // One in star rating, one as main display
    expect(screen.getByText('Based on 1,250 reviews')).toBeInTheDocument();
  });

  it('displays star rating with correct accessibility attributes', () => {
    render(
      <ReviewsSection 
        reviews={mockReviews} 
        rating={4.5} 
        totalReviews={100} 
      />
    );

    const starRating = screen.getByRole('img', { name: /4.5 out of 5 stars/i });
    expect(starRating).toBeInTheDocument();
  });

  it('renders maximum of 3 reviews', () => {
    render(
      <ReviewsSection 
        reviews={mockReviews} 
        rating={4.0} 
        totalReviews={100} 
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    expect(screen.queryByText('Alice Brown')).not.toBeInTheDocument();
    
    expect(screen.getByText('Showing 3 of 4 reviews')).toBeInTheDocument();
  });

  it('displays review content correctly', () => {
    render(
      <ReviewsSection 
        reviews={mockReviews.slice(0, 1)} 
        rating={5.0} 
        totalReviews={1} 
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('2 weeks ago')).toBeInTheDocument();
    expect(screen.getByText(/Amazing place! Highly recommend visiting/)).toBeInTheDocument();
  });

  it('handles profile photos correctly', () => {
    render(
      <ReviewsSection 
        reviews={mockReviews.slice(0, 1)} 
        rating={5.0} 
        totalReviews={1} 
      />
    );

    const profileImage = screen.getByAltText("John Doe's profile");
    expect(profileImage).toBeInTheDocument();
    expect(profileImage).toHaveAttribute('src', 'https://example.com/photo1.jpg');
  });

  it('handles missing profile photos gracefully', () => {
    const reviewWithoutPhoto = {
      ...mockReviews[0],
      profilePhotoUrl: undefined
    };

    render(
      <ReviewsSection 
        reviews={[reviewWithoutPhoto]} 
        rating={5.0} 
        totalReviews={1} 
      />
    );

    expect(screen.queryByAltText("John Doe's profile")).not.toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('displays empty state when no reviews are available', () => {
    render(
      <ReviewsSection 
        reviews={[]} 
        rating={0} 
        totalReviews={0} 
      />
    );

    expect(screen.getByText('No reviews available for this location')).toBeInTheDocument();
    expect(screen.queryByText('Recent Reviews')).not.toBeInTheDocument();
  });

  it('handles singular review count correctly', () => {
    render(
      <ReviewsSection 
        reviews={mockReviews.slice(0, 1)} 
        rating={5.0} 
        totalReviews={1} 
      />
    );

    expect(screen.getByText('Based on 1 review')).toBeInTheDocument();
  });

  it('displays individual review ratings correctly', () => {
    render(
      <ReviewsSection 
        reviews={mockReviews.slice(0, 2)} 
        rating={4.5} 
        totalReviews={100} 
      />
    );

    // Check that individual review ratings are displayed
    const reviewCards = screen.getAllByRole('img', { name: /out of 5 stars/i });
    // Should have overall rating + individual review ratings
    expect(reviewCards.length).toBeGreaterThan(1);
  });

  it('handles zero rating correctly', () => {
    render(
      <ReviewsSection 
        reviews={[]} 
        rating={0} 
        totalReviews={0} 
      />
    );

    const ratingElements = screen.getAllByText('0.0');
    expect(ratingElements).toHaveLength(2); // One in star rating, one as main display
    expect(screen.getByRole('img', { name: /0 out of 5 stars/i })).toBeInTheDocument();
  });

  it('handles decimal ratings correctly', () => {
    render(
      <ReviewsSection 
        reviews={[]} 
        rating={3.7} 
        totalReviews={50} 
      />
    );

    const ratingElements = screen.getAllByText('3.7');
    expect(ratingElements).toHaveLength(2); // One in star rating, one as main display
    expect(screen.getByRole('img', { name: /3.7 out of 5 stars/i })).toBeInTheDocument();
  });

  it('does not show review count message when showing all reviews', () => {
    const twoReviews = mockReviews.slice(0, 2);
    
    render(
      <ReviewsSection 
        reviews={twoReviews} 
        rating={4.5} 
        totalReviews={100} 
      />
    );

    expect(screen.queryByText(/Showing \d+ of \d+ reviews/)).not.toBeInTheDocument();
  });

  it('formats large review counts with commas', () => {
    render(
      <ReviewsSection 
        reviews={mockReviews} 
        rating={4.2} 
        totalReviews={12500} 
      />
    );

    expect(screen.getByText('Based on 12,500 reviews')).toBeInTheDocument();
  });

  it('handles very long review text', () => {
    const longReview: PlaceReview = {
      ...mockReviews[0],
      text: 'This is a very long review that goes on and on and on and should wrap properly in the UI without breaking the layout. '.repeat(5)
    };

    render(
      <ReviewsSection 
        reviews={[longReview]} 
        rating={4.0} 
        totalReviews={1} 
      />
    );

    expect(screen.getByText(/This is a very long review/)).toBeInTheDocument();
  });
});