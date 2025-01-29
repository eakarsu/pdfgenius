import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Pricing.css';

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      name: 'Free',
      price: {
        monthly: 0,
        annual: 0
      },
      features: [
        '100 pages/month',
        'Basic JSON conversion',
        'Standard support',
        'API access',
        '1 user'
      ],
      buttonText: 'Get Started',
      recommended: false
    },
    {
      name: 'Pro',
      price: {
        monthly: 49,
        annual: 39
      },
      features: [
        '1,000 pages/month',
        'Advanced JSON conversion',
        'Priority support',
        'API access',
        'Custom fields',
        '5 users'
      ],
      buttonText: 'Start Free Trial',
      recommended: true
    },
    {
      name: 'Enterprise',
      price: {
        monthly: 199,
        annual: 159
      },
      features: [
        'Unlimited pages',
        'Custom document processing',
        '24/7 support',
        'Advanced API features',
        'Custom integration',
        'Unlimited users'
      ],
      buttonText: 'Contact Sales',
      recommended: false
    }
  ];

  return (
    <div className="pricing-page">
      <div className="pricing-header">
        <h1>Simple, Transparent Pricing</h1>
        <p>Choose the plan that's right for you</p>
        
        <div className="pricing-toggle">
          <span className={!isAnnual ? 'active' : ''}>Monthly</span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={isAnnual} 
              onChange={() => setIsAnnual(!isAnnual)}
            />
            <span className="slider"></span>
          </label>
          <span className={isAnnual ? 'active' : ''}>
            Annual <span className="discount">Save 20%</span>
          </span>
        </div>
      </div>

      <div className="pricing-grid">
        {plans.map((plan, index) => (
          <div 
            key={index} 
            className={`pricing-card ${plan.recommended ? 'recommended' : ''}`}
          >
            {plan.recommended && (
              <div className="recommended-badge">Most Popular</div>
            )}
            <h2>{plan.name}</h2>
            <div className="price">
              <span className="currency">$</span>
              <span className="amount">
                {isAnnual ? plan.price.annual : plan.price.monthly}
              </span>
              <span className="period">
                /month
              </span>
            </div>
            {isAnnual && (
              <div className="annual-savings">
                Billed annually (Save 20%)
              </div>
            )}
            <ul className="features">
              {plan.features.map((feature, featureIndex) => (
                <li key={featureIndex}>
                  <i className="fas fa-check"></i>
                  {feature}
                </li>
              ))}
            </ul>
            <Link 
              to={plan.name === 'Enterprise' ? '/contact' : '/signup'} 
              className={`plan-button ${plan.recommended ? 'recommended' : ''}`}
            >
              {plan.buttonText}
            </Link>
          </div>
        ))}
      </div>

      <div className="pricing-faq">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-grid">
          <div className="faq-item">
            <h3>What happens after my trial ends?</h3>
            <p>After your trial ends, you can choose to upgrade to a paid plan or continue with the free plan limitations.</p>
          </div>
          <div className="faq-item">
            <h3>Can I change plans anytime?</h3>
            <p>Yes, you can upgrade, downgrade, or cancel your plan at any time.</p>
          </div>
          <div className="faq-item">
            <h3>Do you offer custom plans?</h3>
            <p>Yes, contact our sales team for custom enterprise solutions tailored to your needs.</p>
          </div>
          <div className="faq-item">
            <h3>What payment methods do you accept?</h3>
            <p>We accept all major credit cards, PayPal, and wire transfers for enterprise plans.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

