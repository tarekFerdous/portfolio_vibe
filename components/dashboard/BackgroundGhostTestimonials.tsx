import { dashboardData } from '@/data/mock/dashboard';

export const BackgroundGhostTestimonials = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Testimonials Container */}
      <div className="absolute inset-0 flex flex-col justify-between py-12 px-4 md:px-12 opacity-40 dark:opacity-60 blur-[1px]">
        {dashboardData.testimonials.map((text, i) => (
          <div
            key={i}
            className={`text-accents-backgroundGhostTextLight dark:text-accents-backgroundGhostTextDark
              text-xl md:text-3xl font-bold whitespace-nowrap
              ${i % 2 === 0 ? 'text-left ml-[-5%]' : 'text-right mr-[-5%]'}
              ${i % 3 === 0 ? 'opacity-50' : 'opacity-100'}
              transform ${i % 2 === 0 ? 'rotate-[-1deg]' : 'rotate-[1deg]'}
            `}
            style={{
              marginLeft: i % 2 === 0 ? `${(i * 5) % 20}%` : 'auto',
              marginRight: i % 2 !== 0 ? `${(i * 5) % 20}%` : 'auto',
            }}
          >
            {text}
          </div>
        ))}
      </div>

      {/* Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none transition-colors duration-500 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(7,10,14,0.4)_100%)] dark:bg-[radial-gradient(circle_at_center,transparent_30%,rgba(7,10,14,0.85)_100%)]"></div>
    </div>
  );
};
