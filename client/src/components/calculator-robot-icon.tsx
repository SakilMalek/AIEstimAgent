interface CalcuatorRobotIconProps {
  className?: string;
  size?: number;
}

export default function CalculatorRobotIcon({ className = "", size = 20 }: CalcuatorRobotIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Robot Head/Calculator Body */}
      <rect
        x="4"
        y="3"
        width="16"
        height="18"
        rx="2"
        fill="currentColor"
        stroke="none"
      />
      
      {/* Calculator Screen */}
      <rect
        x="6"
        y="5"
        width="12"
        height="3"
        rx="0.5"
        fill="white"
        opacity="0.9"
      />
      
      {/* Robot Eyes (Calculator Buttons Row 1) */}
      <circle cx="8" cy="10.5" r="0.8" fill="white" opacity="0.9" />
      <circle cx="11" cy="10.5" r="0.8" fill="white" opacity="0.9" />
      <circle cx="14" cy="10.5" r="0.8" fill="white" opacity="0.9" />
      <circle cx="17" cy="10.5" r="0.8" fill="white" opacity="0.9" />
      
      {/* Calculator Buttons Row 2 */}
      <circle cx="8" cy="13" r="0.8" fill="white" opacity="0.9" />
      <circle cx="11" cy="13" r="0.8" fill="white" opacity="0.9" />
      <circle cx="14" cy="13" r="0.8" fill="white" opacity="0.9" />
      <circle cx="17" cy="13" r="0.8" fill="white" opacity="0.9" />
      
      {/* Calculator Buttons Row 3 */}
      <circle cx="8" cy="15.5" r="0.8" fill="white" opacity="0.9" />
      <circle cx="11" cy="15.5" r="0.8" fill="white" opacity="0.9" />
      <circle cx="14" cy="15.5" r="0.8" fill="white" opacity="0.9" />
      <circle cx="17" cy="15.5" r="0.8" fill="white" opacity="0.9" />
      
      {/* Bottom Row */}
      <circle cx="9.5" cy="18" r="0.8" fill="white" opacity="0.9" />
      <rect x="12" y="17.2" width="3.5" height="1.6" rx="0.8" fill="white" opacity="0.9" />
      
      {/* Robot Antennae */}
      <line x1="7" y1="3" x2="7" y2="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="17" y1="3" x2="17" y2="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7" cy="1" r="0.8" fill="currentColor" />
      <circle cx="17" cy="1" r="0.8" fill="currentColor" />
    </svg>
  );
}