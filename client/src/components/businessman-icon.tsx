interface BusinessmanIconProps {
  className?: string;
  size?: number;
}

export default function BusinessmanIcon({ className = "", size = 24 }: BusinessmanIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Head */}
      <circle
        cx="12"
        cy="6.5"
        r="2.5"
        fill="currentColor"
        opacity="0.95"
      />
      
      {/* Body/Suit */}
      <path
        d="M12 10c-3 0-5.5 1.8-5.5 4v2.5c0 0.8 0.4 1.5 1.2 1.5h8.6c0.8 0 1.2-0.7 1.2-1.5V14c0-2.2-2.5-4-5.5-4z"
        fill="currentColor"
        opacity="0.85"
      />
      
      {/* Tie */}
      <path
        d="M12 10.8v5.4l-0.6-0.9c-0.15-0.25-0.15-0.65 0-0.9l0.6-0.9 0.6 0.9c0.15 0.25 0.15 0.65 0 0.9L12 16.2v-5.4z"
        fill="currentColor"
        opacity="0.65"
      />
      
      {/* Hard Hat */}
      <path
        d="M9 4.5c0-1.7 1.3-3 3-3s3 1.3 3 3c0 0.3-0.1 0.6-0.2 0.8-0.3 0.2-0.8 0.2-1.1 0-0.6-0.4-1.4-0.4-2 0-0.3 0.2-0.8 0.2-1.1 0C9.1 5.1 9 4.8 9 4.5z"
        fill="currentColor"
        opacity="0.75"
      />
      
      {/* Blueprints/Plans */}
      <rect
        x="16"
        y="12"
        width="3.5"
        height="2.8"
        rx="0.3"
        fill="currentColor"
        opacity="0.6"
      />
      <line
        x1="16.5"
        y1="13"
        x2="19"
        y2="13"
        stroke="currentColor"
        strokeWidth="0.3"
        opacity="0.4"
      />
      <line
        x1="16.5"
        y1="13.8"
        x2="19"
        y2="13.8"
        stroke="currentColor"
        strokeWidth="0.3"
        opacity="0.4"
      />
      
      {/* Construction Tools */}
      <rect
        x="4"
        y="14"
        width="1.2"
        height="3.5"
        rx="0.2"
        fill="currentColor"
        opacity="0.55"
      />
      <circle
        cx="4.6"
        cy="13.5"
        r="0.5"
        fill="currentColor"
        opacity="0.55"
      />
    </svg>
  );
}