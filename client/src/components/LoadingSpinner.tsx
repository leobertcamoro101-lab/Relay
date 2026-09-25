interface LoadingSpinnerProps {
  asOverlay?: boolean;
}

function LoadingSpinner({ asOverlay }: LoadingSpinnerProps) {
  return (
    <div
      className={`${
        asOverlay
          ? 'absolute top-0 left-0 h-full w-full bg-relay-bg/90 flex justify-center items-center'
          : ''
      }`}
    >
      <div className="w-16 h-16 rounded-full border-[5px] border-relay-accent border-r-transparent border-l-transparent animate-spin" />
    </div>
  );
}

export default LoadingSpinner;
