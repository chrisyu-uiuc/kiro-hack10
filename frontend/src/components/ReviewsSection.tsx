import React from 'react';
import { PlaceReview } from '@/types';

interface ReviewsSectionProps {
  reviews: PlaceReview[];
  rating: number;
  totalReviews: number;
}

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: 'small' | 'medium' | 'large';
  showRating?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({ 
  rating, 
  maxStars = 5, 
  size = 'medium',
  showRating = false 
}) => {
  const getStarSize = () => {
    switch (size) {
      case 'small': return '14px';
      case 'large': return '24px';
      default: return '18px';
    }
  };

  const starSize = getStarSize();
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '2px' 
      }}
      role="img"
      aria-label={`${rating} out of ${maxStars} stars`}
    >
      {/* Full stars */}
      {Array.from({ length: fullStars }).map((_, index) => (
        <span
          key={`full-${index}`}
          style={{
            color: '#fbbf24',
            fontSize: starSize,
            lineHeight: 1
          }}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
      
      {/* Half star */}
      {hasHalfStar && (
        <span
          style={{
            position: 'relative',
            color: '#e5e7eb',
            fontSize: starSize,
            lineHeight: 1
          }}
          aria-hidden="true"
        >
          ★
          <span
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '50%',
              overflow: 'hidden',
              color: '#fbbf24'
            }}
          >
            ★
          </span>
        </span>
      )}
      
      {/* Empty stars */}
      {Array.from({ length: emptyStars }).map((_, index) => (
        <span
          key={`empty-${index}`}
          style={{
            color: '#e5e7eb',
            fontSize: starSize,
            lineHeight: 1
          }}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
      
      {showRating && (
        <span
          style={{
            marginLeft: '8px',
            fontSize: size === 'small' ? '12px' : '14px',
            color: '#6b7280',
            fontWeight: '500'
          }}
        >
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

const ReviewCard: React.FC<{ review: PlaceReview }> = ({ review }) => {
  return (
    <div
      style={{
        padding: '16px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        marginBottom: '12px'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '8px'
        }}
      >
        {review.profilePhotoUrl && (
          <img
            src={review.profilePhotoUrl}
            alt={`${review.authorName}'s profile`}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              objectFit: 'cover',
              flexShrink: 0
            }}
            onError={(e) => {
              // Hide image if it fails to load
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px',
              flexWrap: 'wrap'
            }}
          >
            <span
              style={{
                fontWeight: '600',
                color: '#111827',
                fontSize: '14px'
              }}
            >
              {review.authorName}
            </span>
            
            <StarRating rating={review.rating} size="small" />
            
            <span
              style={{
                fontSize: '12px',
                color: '#6b7280'
              }}
            >
              {review.relativeTimeDescription}
            </span>
          </div>
          
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              lineHeight: '1.5',
              color: '#374151',
              wordBreak: 'break-word'
            }}
          >
            {review.text}
          </p>
        </div>
      </div>
    </div>
  );
};

const ReviewsSection: React.FC<ReviewsSectionProps> = ({ 
  reviews, 
  rating, 
  totalReviews 
}) => {
  const displayReviews = reviews.slice(0, 3); // Show max 3 reviews

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Overall Rating Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px'
            }}
          >
            <StarRating rating={rating} size="large" showRating />
            <span
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827'
              }}
            >
              {rating.toFixed(1)}
            </span>
          </div>
          
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: '#6b7280'
            }}
          >
            Based on {totalReviews.toLocaleString()} review{totalReviews !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Reviews List */}
      {displayReviews.length > 0 ? (
        <div>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '12px',
              margin: '0 0 12px 0'
            }}
          >
            Recent Reviews
          </h3>
          
          <div>
            {displayReviews.map((review, index) => (
              <ReviewCard key={`${review.authorName}-${review.time}-${index}`} review={review} />
            ))}
          </div>
          
          {reviews.length > 3 && (
            <p
              style={{
                fontSize: '14px',
                color: '#6b7280',
                textAlign: 'center',
                margin: '12px 0 0 0',
                fontStyle: 'italic'
              }}
            >
              Showing {displayReviews.length} of {reviews.length} reviews
            </p>
          )}
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '24px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: '#6b7280'
            }}
          >
            No reviews available for this location
          </p>
        </div>
      )}
    </div>
  );
};

export default ReviewsSection;