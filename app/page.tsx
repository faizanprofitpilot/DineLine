'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState, useMemo } from 'react';
import { createBrowserClient } from '@/lib/clients/supabase';
import { PLAN_LIMITS } from '@/lib/constants/plans';

function LandingPageContent() {
  const [isVisible, setIsVisible] = useState<Record<string, boolean>>({});
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const sectionsRef = useRef<Record<string, HTMLElement | null>>({});
  
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return createBrowserClient();
  }, []);

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    // Listen for auth changes
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsAuthenticated(!!session);
      });
      return () => subscription.unsubscribe();
    }
  }, [supabase]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    // Create intersection observers for each section
    Object.keys(sectionsRef.current).forEach((key) => {
      const element = sectionsRef.current[key];
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible((prev) => ({ ...prev, [key]: true }));
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav 
        className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50 transition-all duration-300"
        style={{ borderColor: '#DEB887' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 relative">
            <div className="flex items-center">
              <Link href="/" className="transition-transform duration-300 hover:scale-105">
                <img 
                  src="/full-logo.png" 
                  alt="DineLine" 
                  className="h-16 w-auto"
                />
              </Link>
            </div>
            <nav className="hidden md:flex items-center space-x-6 absolute left-1/2 transform -translate-x-1/2">
              <a
                href="#how-it-works"
                className="text-sm font-medium transition-all duration-300 hover:[color:#8B4513] hover:scale-105 cursor-pointer"
                style={{ color: '#A0522D' }}
              >
                How It Works
              </a>
              <a
                href="#pricing"
                className="text-sm font-medium transition-all duration-300 hover:[color:#8B4513] hover:scale-105 cursor-pointer"
                style={{ color: '#A0522D' }}
              >
                Pricing
              </a>
            </nav>
            <div className="flex items-center space-x-6">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 shadow-sm text-white hover:[background-color:#654321] hover:scale-105 hover:shadow-lg cursor-pointer"
                  style={{ backgroundColor: '#8B4513' }}
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 hover:[color:#8B4513] hover:scale-105 cursor-pointer"
                    style={{ color: '#A0522D' }}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/login"
                    className="px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 shadow-sm text-white hover:[background-color:#654321] hover:scale-105 hover:shadow-lg cursor-pointer"
                    style={{ backgroundColor: '#8B4513' }}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 1. Quiet Confidence Hero */}
      <section 
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32"
        ref={(el) => { sectionsRef.current['hero'] = el; }}
      >
        <div className="text-left">
          <p 
            className="text-sm uppercase tracking-wider mb-6"
            style={{ color: '#A0522D' }}
          >
            Restaurant Phone Automation
          </p>
          <h1 
            className={`text-4xl sm:text-5xl md:text-6xl font-normal mb-8 leading-tight transition-all duration-1000 ${
              isVisible['hero'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ color: '#8B4513' }}
          >
            Your restaurant never stops answering the phone.
          </h1>
          <p 
            className={`text-lg sm:text-xl mb-6 leading-relaxed transition-all duration-1000 delay-200 ${
              isVisible['hero'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ color: '#654321' }}
          >
            DineLine answers calls, takes orders, and sends clean kitchen tickets while your staff focuses on service.
          </p>
          <div 
            className={`mb-10 transition-all duration-1000 delay-300 ${
              isVisible['hero'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <p className="text-sm mb-2" style={{ color: '#A0522D' }}>Try it now:</p>
            <a
              href="tel:+12405895335"
              className="inline-block text-2xl sm:text-3xl font-medium transition-all duration-300 hover:[color:#654321] hover:scale-105 cursor-pointer"
              style={{ color: '#8B4513' }}
            >
              +1 (240) 589-5335
            </a>
            <p className="text-xs mt-2" style={{ color: '#A0522D' }}>Call to experience our AI receptionist</p>
          </div>
          <div 
            className={`transition-all duration-1000 delay-400 ${
              isVisible['hero'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="inline-block px-8 py-4 rounded-lg text-base font-medium transition-all duration-300 text-white hover:[background-color:#654321] cursor-pointer"
                style={{ backgroundColor: '#8B4513' }}
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                href="#how-it-works"
                className="inline-block px-8 py-4 rounded-lg text-base font-medium transition-all duration-300 text-white hover:[background-color:#654321] cursor-pointer"
                style={{ backgroundColor: '#8B4513' }}
              >
                See how it works
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Hero Illustration - Visual Break */}
      <section 
        className="w-full py-16 overflow-hidden"
        ref={(el) => { sectionsRef.current['heroIllustration'] = el; }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-end">
            <img
              src="/hero-illustration.png"
              alt="DineLine AI Receptionist"
              className={`w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl h-auto opacity-90 transition-all duration-1000 ease-out ${
                isVisible['heroIllustration'] 
                  ? 'opacity-100 translate-x-0' 
                  : 'opacity-0 translate-x-16'
              }`}
            />
          </div>
        </div>
      </section>

      {/* 2. Problem → Resolution Panels */}
      <section 
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-20"
        ref={(el) => { sectionsRef.current['problems'] = el; }}
      >
        {/* Panel 1 */}
        <div 
          className={`grid md:grid-cols-2 gap-12 items-center transition-all duration-1000 ${
            isVisible['problems'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div>
            <p className="text-xl font-medium mb-4" style={{ color: '#8B4513' }}>
              During rush hour, staff stop answering phones.
            </p>
          </div>
          <div>
            <p className="text-base leading-relaxed" style={{ color: '#654321' }}>
              DineLine handles every call, even when your kitchen is at capacity. Orders are captured, confirmed, and sent to your kitchen email automatically. No missed calls, no lost revenue.
            </p>
          </div>
        </div>

        {/* Panel 2 */}
        <div 
          className={`grid md:grid-cols-2 gap-12 items-center transition-all duration-1000 delay-200 ${
            isVisible['problems'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div>
            <p className="text-xl font-medium mb-4" style={{ color: '#8B4513' }}>
              After hours, calls go to voicemail.
            </p>
          </div>
          <div>
            <p className="text-base leading-relaxed" style={{ color: '#654321' }}>
              Your AI receptionist works 24/7. Late-night orders, early morning reservations, weekend calls—everything is captured and queued for the next day.
            </p>
          </div>
        </div>

        {/* Panel 3 */}
        <div 
          className={`grid md:grid-cols-2 gap-12 items-center transition-all duration-1000 delay-400 ${
            isVisible['problems'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div>
            <p className="text-xl font-medium mb-4" style={{ color: '#8B4513' }}>
              Orders are misheard or written down wrong.
            </p>
          </div>
          <div>
            <p className="text-base leading-relaxed" style={{ color: '#654321' }}>
              Every call is transcribed and stored. Orders arrive as clean kitchen tickets with full transcripts and recordings. Review exactly what was said, when you need to.
            </p>
          </div>
        </div>

        {/* Panel 4 - Menu Upload */}
        <div 
          className={`grid md:grid-cols-2 gap-12 items-center transition-all duration-1000 delay-600 ${
            isVisible['problems'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div>
            <p className="text-xl font-medium mb-4" style={{ color: '#8B4513' }}>
              The AI knows your menu items.
            </p>
          </div>
          <div>
            <p className="text-base leading-relaxed" style={{ color: '#654321' }}>
              Upload your menu as an image, PDF, or text file. Our AI automatically extracts all dishes, categories, and descriptions. The receptionist learns your menu instantly and can answer questions about ingredients, dietary options, and popular items.
            </p>
          </div>
        </div>

        {/* Panel 5 - Knowledge Base */}
        <div 
          className={`grid md:grid-cols-2 gap-12 items-center transition-all duration-1000 delay-800 ${
            isVisible['problems'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div>
            <p className="text-xl font-medium mb-4" style={{ color: '#8B4513' }}>
              Responses that reflect your restaurant.
            </p>
          </div>
          <div>
            <p className="text-base leading-relaxed" style={{ color: '#654321' }}>
              Customize your knowledge base with cuisine details, dietary options, location information, and restaurant policies. The AI receptionist speaks in your voice and answers questions specific to your restaurant.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Single Flow Strip */}
      <section 
        id="how-it-works"
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24"
        ref={(el) => { sectionsRef.current['flow'] = el; }}
      >
        <div 
          className={`flex flex-col md:flex-row items-center justify-between gap-8 mb-12 transition-all duration-1000 ${
            isVisible['flow'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex-1 text-center md:text-left">
            <p className="text-sm font-medium mb-2" style={{ color: '#8B4513' }}>Phone Call</p>
          </div>
          <div className="hidden md:block" style={{ color: '#DEB887' }}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="flex-1 text-center md:text-left">
            <p className="text-sm font-medium mb-2" style={{ color: '#8B4513' }}>AI Answer</p>
          </div>
          <div className="hidden md:block" style={{ color: '#DEB887' }}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="flex-1 text-center md:text-left">
            <p className="text-sm font-medium mb-2" style={{ color: '#8B4513' }}>Kitchen Ticket</p>
          </div>
          <div className="hidden md:block" style={{ color: '#DEB887' }}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="flex-1 text-center md:text-left">
            <p className="text-sm font-medium mb-2" style={{ color: '#8B4513' }}>Dashboard</p>
          </div>
        </div>
        <div 
          className={`transition-all duration-1000 delay-300 ease-out ${
            isVisible['flow'] 
              ? 'opacity-100 translate-x-0' 
              : 'opacity-0 -translate-x-16'
          }`}
        >
          <img
            src="/2nd illustration.png"
            alt="DineLine Order Flow"
            className="w-full max-w-4xl mx-auto h-auto"
          />
        </div>
      </section>

      {/* 4. Who This Is For */}
      <section 
        className="bg-[#FFF8DC] py-24"
        ref={(el) => { sectionsRef.current['personas'] = el; }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 
            className={`text-3xl sm:text-4xl font-normal mb-16 text-left transition-all duration-1000 ${
              isVisible['personas'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ color: '#8B4513' }}
          >
            Built for real restaurants
          </h2>
          
          <div className="grid md:grid-cols-2 gap-12">
            {[
              {
                title: 'Busy takeout spots',
                description: 'High call volume during lunch and dinner rushes. DineLine handles the queue so your staff can focus on food prep and delivery coordination.',
              },
              {
                title: 'Small family restaurants',
                description: 'Limited staff means phones go unanswered when everyone is serving tables. DineLine ensures every call is captured, even during peak hours.',
              },
              {
                title: 'Late-night kitchens',
                description: 'Calls come in after closing time. DineLine takes orders and reservations 24/7, queuing them for the next business day.',
              },
              {
                title: 'Understaffed teams',
                description: 'When you can\'t afford a dedicated phone person, DineLine becomes your receptionist. No training, no scheduling, no sick days.',
              },
            ].map((persona, index) => (
              <div
                key={index}
                className={`transition-all duration-1000 ${
                  isVisible['personas'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <h3 className="text-xl font-medium mb-3" style={{ color: '#8B4513' }}>
                  {persona.title}
                </h3>
                <p className="text-base leading-relaxed" style={{ color: '#654321' }}>
                  {persona.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Simple Pricing Table */}
      <section 
        id="pricing"
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24"
        ref={(el) => { sectionsRef.current['pricing'] = el; }}
      >
        <div 
          className={`transition-all duration-1000 ${
            isVisible['pricing'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 
            className="text-3xl sm:text-4xl font-normal mb-12 text-left"
            style={{ color: '#8B4513' }}
          >
            Pricing
          </h2>
          
          <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#DEB887' }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#F5F3ED' }}>
                  <th className="text-left px-6 py-4 font-medium" style={{ color: '#8B4513' }}>Plan</th>
                  <th className="text-left px-6 py-4 font-medium" style={{ color: '#8B4513' }}>Minutes</th>
                  <th className="text-left px-6 py-4 font-medium" style={{ color: '#8B4513' }}>Price</th>
                  <th className="text-left px-6 py-4 font-medium" style={{ color: '#8B4513' }}></th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    name: PLAN_LIMITS.starter.name,
                    minutes: `${PLAN_LIMITS.starter.minutesPerMonth} minutes/month`,
                    price: `$${PLAN_LIMITS.starter.price}/month`,
                    planKey: 'starter',
                    isTrial: true,
                  },
                  {
                    name: PLAN_LIMITS.professional.name,
                    minutes: `${PLAN_LIMITS.professional.minutesPerMonth} minutes/month`,
                    price: `$${PLAN_LIMITS.professional.price}/month`,
                    planKey: 'professional',
                    isTrial: false,
                  },
                  {
                    name: PLAN_LIMITS.turbo.name,
                    minutes: `${PLAN_LIMITS.turbo.minutesPerMonth} minutes/month`,
                    price: `$${PLAN_LIMITS.turbo.price}/month`,
                    planKey: 'turbo',
                    isTrial: false,
                  },
                ].map((plan, index) => (
                  <tr 
                    key={index}
                    className="border-t"
                    style={{ borderColor: '#DEB887' }}
                  >
                    <td className="px-6 py-4 font-medium" style={{ color: '#8B4513' }}>
                      {plan.name}
                    </td>
                    <td className="px-6 py-4" style={{ color: '#654321' }}>
                      {plan.minutes}
                    </td>
                    <td className="px-6 py-4" style={{ color: '#654321' }}>
                      {plan.price}
                    </td>
                    <td className="px-6 py-4">
                      {isAuthenticated ? (
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch('/api/stripe/checkout', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                  plan: plan.planKey,
                                  trial: plan.isTrial || false
                                }),
                              });
                              const data = await response.json();
                              if (data.url) {
                                window.location.href = data.url;
                              } else {
                                alert('Failed to create checkout session. Please try again.');
                              }
                            } catch (error) {
                              console.error('Error creating checkout:', error);
                              alert('Failed to create checkout session. Please try again.');
                            }
                          }}
                          className="text-sm font-medium px-4 py-2 rounded transition-all duration-300 hover:[background-color:#654321] cursor-pointer text-white"
                          style={{ backgroundColor: '#8B4513' }}
                        >
                          {plan.isTrial ? 'Start Free Trial' : 'Subscribe'}
                        </button>
                      ) : (
                        <Link
                          href={plan.isTrial ? '/login?trial=starter' : '/login'}
                          className="inline-block text-sm font-medium px-4 py-2 rounded transition-all duration-300 hover:[background-color:#654321] cursor-pointer text-white"
                          style={{ backgroundColor: '#8B4513' }}
                        >
                          {plan.isTrial ? 'Start Free Trial' : 'Get Started'}
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 6. Final Reassurance CTA */}
      <section 
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24"
        ref={(el) => { sectionsRef.current['cta'] = el; }}
      >
        <div 
          className={`text-left transition-all duration-1000 ${
            isVisible['cta'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 
            className="text-3xl sm:text-4xl font-normal mb-6"
            style={{ color: '#8B4513' }}
          >
            Set up once. Let it run.
          </h2>
          <p 
            className="text-lg mb-10 leading-relaxed"
            style={{ color: '#654321' }}
          >
            DineLine works quietly in the background. No POS changes. No staff retraining. Just connect your phone number and kitchen email.
          </p>
          <div>
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="inline-block px-8 py-4 rounded-lg text-base font-medium transition-all duration-300 text-white hover:[background-color:#654321] cursor-pointer"
                style={{ backgroundColor: '#8B4513' }}
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-block px-8 py-4 rounded-lg text-base font-medium transition-all duration-300 text-white hover:[background-color:#654321] cursor-pointer"
                style={{ backgroundColor: '#8B4513' }}
              >
                Get Started
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t" style={{ borderColor: '#DEB887' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <img 
              src="/full-logo.png" 
              alt="DineLine" 
              className="h-8 w-auto mx-auto mb-4 transition-transform duration-300 hover:scale-110"
            />
            <p className="mb-4" style={{ color: '#A0522D' }}>Never miss a restaurant phone order again.</p>
            <div className="flex justify-center space-x-6">
              {isAuthenticated ? (
                <Link 
                  href="/dashboard" 
                  className="transition-all duration-300 hover:scale-110 cursor-pointer" 
                  style={{ color: '#8B4513' }}
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    className="transition-all duration-300 hover:scale-110 cursor-pointer" 
                    style={{ color: '#8B4513' }}
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/login" 
                    className="transition-all duration-300 hover:scale-110 cursor-pointer" 
                    style={{ color: '#8B4513' }}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
            <p className="mt-8 text-sm" style={{ color: '#A0522D' }}>© 2024 DineLine. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2 animate-pulse" style={{ color: '#8B4513' }}>Loading...</div>
        </div>
      </div>
    }>
      <LandingPageContent />
    </Suspense>
  );
}
