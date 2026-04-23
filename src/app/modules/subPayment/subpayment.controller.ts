

import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PaymentService } from './subpayment.service';

import config from '../../config';
import Stripe from 'stripe';
 const stripe = new Stripe(config.stripe.stripe_secret_key as string);

// ─── Checkout Session Create ──────────────────────────────────────────────────
const createCheckoutSession = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const { planId, promoCode } = req.body;

  const result = await PaymentService.createCheckoutSession(
    userId,
    planId,
    promoCode,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Checkout session created successfully',
    data: result,
  });
});

// ─── Stripe Webhook ───────────────────────────────────────────────────────────
const stripeWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;

  try {
    await PaymentService.handleStripeWebhook(req.body, signature);
    res.status(200).json({ received: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// ─── Get My Payment History ───────────────────────────────────────────────────
const getMyPaymentHistory = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;

  const result = await PaymentService.getMyPaymentHistory(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment history fetched successfully',
    data: result,
  });
});

// ─── Admin: Get All Payment History ──────────────────────────────────────────
const getAllPaymentHistory = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getAllPaymentHistory();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All payment history fetched successfully',
    data: result,
  });
});

// ─── Cancel Subscription ──────────────────────────────────────────────────────
const cancelSubscription = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;

  const result = await PaymentService.cancelSubscription(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscription cancelled successfully',
    data: result,
  });
});















const paymentSuccess = catchAsync(async (req: Request, res: Response) => {
  const { session_id } = req.query;

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id as string);

    if (session.payment_status === 'paid') {
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Payment Successful</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }

            body {
              font-family: 'Inter', sans-serif;
              background: #0a0a0f;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              position: relative;
            }

            /* Ambient background blobs */
            body::before {
              content: '';
              position: fixed;
              top: -200px;
              left: -200px;
              width: 600px;
              height: 600px;
              background: radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, transparent 70%);
              border-radius: 50%;
              pointer-events: none;
            }
            body::after {
              content: '';
              position: fixed;
              bottom: -200px;
              right: -200px;
              width: 600px;
              height: 600px;
              background: radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%);
              border-radius: 50%;
              pointer-events: none;
            }

            .blob-mid {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 800px;
              height: 400px;
              background: radial-gradient(ellipse, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
              pointer-events: none;
            }

            .card {
              position: relative;
              background: linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
              backdrop-filter: blur(40px);
              -webkit-backdrop-filter: blur(40px);
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 32px;
              padding: 64px 56px;
              text-align: center;
              max-width: 500px;
              width: 92%;
              box-shadow:
                0 0 0 1px rgba(124, 58, 237, 0.1),
                0 32px 64px rgba(0,0,0,0.6),
                inset 0 1px 0 rgba(255,255,255,0.1);
              animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1);
            }

            @keyframes fadeUp {
              from { opacity: 0; transform: translateY(40px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }

            /* Top gradient line */
            .card::before {
              content: '';
              position: absolute;
              top: 0;
              left: 10%;
              right: 10%;
              height: 1px;
              background: linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.8), rgba(16, 185, 129, 0.8), transparent);
              border-radius: 50%;
            }

            .icon-wrap {
              position: relative;
              width: 96px;
              height: 96px;
              margin: 0 auto 32px;
            }

            .icon-ring {
              position: absolute;
              inset: -8px;
              border-radius: 50%;
              background: conic-gradient(from 0deg, #7c3aed, #10b981, #6366f1, #7c3aed);
              animation: spin 4s linear infinite;
              opacity: 0.6;
            }

            .icon-ring::after {
              content: '';
              position: absolute;
              inset: 3px;
              background: #0a0a0f;
              border-radius: 50%;
            }

            @keyframes spin {
              to { transform: rotate(360deg); }
            }

            .icon-inner {
              position: absolute;
              inset: 0;
              background: linear-gradient(135deg, #7c3aed, #6366f1);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 0 40px rgba(124, 58, 237, 0.5);
            }

            .icon-inner svg {
              width: 42px;
              height: 42px;
              stroke: white;
              stroke-width: 2.5;
              fill: none;
              stroke-linecap: round;
              stroke-linejoin: round;
            }

            .badge {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05));
              border: 1px solid rgba(16, 185, 129, 0.3);
              color: #10b981;
              font-size: 11px;
              font-weight: 700;
              padding: 5px 14px;
              border-radius: 50px;
              margin-bottom: 20px;
              letter-spacing: 1.5px;
              text-transform: uppercase;
            }

            .badge::before {
              content: '';
              width: 6px;
              height: 6px;
              background: #10b981;
              border-radius: 50%;
              box-shadow: 0 0 8px #10b981;
              animation: blink 1.5s ease infinite;
            }

            @keyframes blink {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.3; }
            }

            h1 {
              font-size: 32px;
              font-weight: 800;
              color: #ffffff;
              margin-bottom: 14px;
              letter-spacing: -1px;
              line-height: 1.2;
            }

            h1 span {
              background: linear-gradient(135deg, #7c3aed, #10b981);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }

            p {
              font-size: 15px;
              color: rgba(255,255,255,0.45);
              line-height: 1.8;
              margin-bottom: 40px;
              font-weight: 400;
            }

            .divider {
              height: 1px;
              background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
              margin-bottom: 40px;
            }

            .btn {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              background: linear-gradient(135deg, #7c3aed, #6366f1);
              color: white;
              text-decoration: none;
              padding: 15px 44px;
              border-radius: 14px;
              font-size: 15px;
              font-weight: 600;
              letter-spacing: 0.2px;
              box-shadow:
                0 8px 32px rgba(124, 58, 237, 0.4),
                inset 0 1px 0 rgba(255,255,255,0.2);
              transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .btn:hover {
              transform: translateY(-3px);
              box-shadow:
                0 16px 40px rgba(124, 58, 237, 0.55),
                inset 0 1px 0 rgba(255,255,255,0.2);
            }

            .btn svg {
              width: 18px;
              height: 18px;
              stroke: white;
              stroke-width: 2.5;
              fill: none;
              transition: transform 0.25s;
            }

            .btn:hover svg {
              transform: translateX(3px);
            }

            .footer {
              margin-top: 36px;
              font-size: 12px;
              color: rgba(255,255,255,0.15);
              font-weight: 500;
            }

            /* Floating particles */
            .particles {
              position: fixed;
              inset: 0;
              pointer-events: none;
              overflow: hidden;
            }

            .particle {
              position: absolute;
              width: 2px;
              height: 2px;
              background: rgba(124, 58, 237, 0.6);
              border-radius: 50%;
              animation: float linear infinite;
            }

            @keyframes float {
              0%   { transform: translateY(100vh) translateX(0); opacity: 0; }
              10%  { opacity: 1; }
              90%  { opacity: 1; }
              100% { transform: translateY(-10vh) translateX(30px); opacity: 0; }
            }
          </style>
        </head>
        <body>
          <div class="particles">
            <div class="particle" style="left:10%; animation-duration:8s; animation-delay:0s;"></div>
            <div class="particle" style="left:25%; animation-duration:12s; animation-delay:2s; background:rgba(16,185,129,0.6);"></div>
            <div class="particle" style="left:50%; animation-duration:9s; animation-delay:4s;"></div>
            <div class="particle" style="left:70%; animation-duration:11s; animation-delay:1s; background:rgba(99,102,241,0.6);"></div>
            <div class="particle" style="left:85%; animation-duration:10s; animation-delay:3s; background:rgba(16,185,129,0.6);"></div>
          </div>

          <div class="blob-mid"></div>

          <div class="card">
            <div class="icon-wrap">
              <div class="icon-ring"></div>
              <div class="icon-inner">
                <svg viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>

            <div class="badge">Payment Confirmed</div>

            <h1>You're <span>Premium</span> Now!</h1>
            <p>Your subscription is active and ready.<br/>Unlock everything we have to offer.</p>

            <div class="divider"></div>

            <a href="${config.frontend_url}" class="btn">
              Go to Dashboard
              <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>

            <div class="footer">© ${new Date().getFullYear()} Higgibod · All rights reserved</div>
          </div>
        </body>
        </html>
      `);
    }

    // ── Payment Failed ──────────────────────────────────────────────────────────
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Payment Failed</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            font-family: 'Inter', sans-serif;
            background: #0a0a0f;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            position: relative;
          }

          body::before {
            content: '';
            position: fixed;
            top: -200px; left: -200px;
            width: 600px; height: 600px;
            background: radial-gradient(circle, rgba(239, 68, 68, 0.12) 0%, transparent 70%);
            border-radius: 50%;
            pointer-events: none;
          }

          body::after {
            content: '';
            position: fixed;
            bottom: -200px; right: -200px;
            width: 600px; height: 600px;
            background: radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, transparent 70%);
            border-radius: 50%;
            pointer-events: none;
          }

          .card {
            position: relative;
            background: linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
            backdrop-filter: blur(40px);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 32px;
            padding: 64px 56px;
            text-align: center;
            max-width: 500px;
            width: 92%;
            box-shadow:
              0 0 0 1px rgba(239, 68, 68, 0.1),
              0 32px 64px rgba(0,0,0,0.6),
              inset 0 1px 0 rgba(255,255,255,0.08);
            animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1);
          }

          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(40px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }

          .card::before {
            content: '';
            position: absolute;
            top: 0; left: 10%; right: 10%;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.8), transparent);
          }

          .icon-wrap {
            position: relative;
            width: 96px; height: 96px;
            margin: 0 auto 32px;
          }

          .icon-ring {
            position: absolute;
            inset: -8px;
            border-radius: 50%;
            background: conic-gradient(from 0deg, #ef4444, #f97316, #ef4444);
            animation: spin 4s linear infinite;
            opacity: 0.5;
          }

          .icon-ring::after {
            content: '';
            position: absolute;
            inset: 3px;
            background: #0a0a0f;
            border-radius: 50%;
          }

          @keyframes spin { to { transform: rotate(360deg); } }

          .icon-inner {
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 40px rgba(239, 68, 68, 0.4);
          }

          .icon-inner svg {
            width: 42px; height: 42px;
            stroke: white; stroke-width: 2.5;
            fill: none;
            stroke-linecap: round;
          }

          .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #ef4444;
            font-size: 11px;
            font-weight: 700;
            padding: 5px 14px;
            border-radius: 50px;
            margin-bottom: 20px;
            letter-spacing: 1.5px;
            text-transform: uppercase;
          }

          h1 {
            font-size: 32px;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 14px;
            letter-spacing: -1px;
          }

          p {
            font-size: 15px;
            color: rgba(255,255,255,0.45);
            line-height: 1.8;
            margin-bottom: 40px;
          }

          .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
            margin-bottom: 40px;
          }

          .btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            text-decoration: none;
            padding: 15px 44px;
            border-radius: 14px;
            font-size: 15px;
            font-weight: 600;
            box-shadow: 0 8px 32px rgba(239, 68, 68, 0.35), inset 0 1px 0 rgba(255,255,255,0.2);
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          }

          .btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 16px 40px rgba(239, 68, 68, 0.5), inset 0 1px 0 rgba(255,255,255,0.2);
          }

          .btn svg {
            width: 18px; height: 18px;
            stroke: white; stroke-width: 2.5;
            fill: none;
          }

          .footer {
            margin-top: 36px;
            font-size: 12px;
            color: rgba(255,255,255,0.15);
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-wrap">
            <div class="icon-ring"></div>
            <div class="icon-inner">
              <svg viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </div>
          </div>

          <div class="badge">Payment Failed</div>

          <h1>Something Went Wrong</h1>
          <p>Your payment could not be processed.<br/>Please try again with a different card.</p>

          <div class="divider"></div>

          <a href="${config.frontend_url}" class="btn">
            <svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
            Try Again
          </a>

          <div class="footer">© ${new Date().getFullYear()} Higgibod · All rights reserved</div>
        </div>
      </body>
      </html>
    `);

  } catch {
    return res.send(`
      <!DOCTYPE html>
      <html><head><meta charset="UTF-8"/>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@600&display=swap" rel="stylesheet"/>
      <style>
        body { background:#0a0a0f; display:flex; align-items:center; justify-content:center; min-height:100vh; font-family:'Inter',sans-serif; }
        p { color:rgba(255,255,255,0.4); font-size:15px; }
      </style>
      </head>
      <body><p>Invalid session. Please contact support.</p></body>
      </html>
    `);
  }
});


const paymentCancel = (req: Request, res: Response) => {
  return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Payment Cancelled</title>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
  <style>
    :root {
      --red: #ef4444;
      --red-light: #f87171;
      --orange: #f97316;
      --orange-light: #fb923c;
      --bg: #07070f;
      --card-bg: rgba(255,255,255,0.03);
      --border: rgba(255,255,255,0.07);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'DM Sans', sans-serif;
      background: var(--bg);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    #canvas {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
    }

    /* ── Mesh background ── */
    .mesh {
      position: fixed;
      inset: 0;
      z-index: 0;
      background:
        radial-gradient(ellipse 70% 60% at 15% 20%, rgba(239,68,68,0.10) 0%, transparent 65%),
        radial-gradient(ellipse 60% 70% at 85% 80%, rgba(249,115,22,0.08) 0%, transparent 65%),
        radial-gradient(ellipse 50% 50% at 50% 50%, rgba(239,68,68,0.04) 0%, transparent 70%);
      pointer-events: none;
    }

    /* ── Grid ── */
    .grid {
      position: fixed;
      inset: 0;
      z-index: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 60px 60px;
      mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
      pointer-events: none;
    }

    /* ── Card ── */
    .card {
      position: relative;
      z-index: 10;
      background: var(--card-bg);
      backdrop-filter: blur(60px);
      -webkit-backdrop-filter: blur(60px);
      border: 1px solid var(--border);
      border-radius: 28px;
      padding: 60px 52px 52px;
      text-align: center;
      max-width: 480px;
      width: 92%;
      box-shadow:
        0 0 0 1px rgba(239,68,68,0.08),
        0 40px 80px rgba(0,0,0,0.7),
        inset 0 1px 0 rgba(255,255,255,0.06);
      opacity: 0;
      transform: translateY(32px) scale(0.96);
      animation: cardIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
    }

    @keyframes cardIn {
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .card::before {
      content: '';
      position: absolute;
      top: 0; left: 15%; right: 15%;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--red), var(--orange), transparent);
      border-radius: 50%;
      opacity: 0;
      animation: shimmerIn 0.6s ease 1s forwards;
    }

    @keyframes shimmerIn { to { opacity: 1; } }

    /* ── Icon ── */
    .icon-wrap {
      position: relative;
      width: 100px;
      height: 100px;
      margin: 0 auto 36px;
    }

    .ring-outer {
      position: absolute;
      inset: -12px;
      border-radius: 50%;
      background: conic-gradient(from 0deg, var(--red), var(--orange), var(--red-light), var(--orange-light), var(--red));
      animation: spin 5s linear infinite;
      opacity: 0;
      animation-delay: 0.8s;
      animation-fill-mode: forwards;
    }

    .ring-outer::before {
      content: '';
      position: absolute;
      inset: 3px;
      background: var(--bg);
      border-radius: 50%;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .ring-glow {
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(239,68,68,0.35), transparent 70%);
      animation: glowPulse 2.5s ease-in-out infinite;
      animation-delay: 1s;
    }

    @keyframes glowPulse {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.35); opacity: 1; }
    }

    .orbit {
      position: absolute;
      inset: -20px;
      border-radius: 50%;
      pointer-events: none;
      animation: orbitSpin 7s linear infinite;
    }

    @keyframes orbitSpin { to { transform: rotate(360deg); } }

    .orbit-dot {
      position: absolute;
      width: 5px; height: 5px;
      background: var(--red-light);
      border-radius: 50%;
      top: 0; left: 50%;
      transform: translateX(-50%);
      box-shadow: 0 0 8px var(--red);
      opacity: 0;
      animation: dotFadeIn 0.3s ease 1.2s forwards;
    }

    .orbit-dot.orange {
      background: var(--orange-light);
      box-shadow: 0 0 8px var(--orange);
      top: auto; bottom: 0;
      animation-delay: 1.4s;
    }

    @keyframes dotFadeIn { to { opacity: 1; } }

    .icon-circle {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: linear-gradient(135deg, #dc2626, #ef4444 50%, #f97316);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: iconPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.9s both, iconGlow 2.5s ease 1.4s infinite;
    }

    @keyframes iconPop {
      from { transform: scale(0) rotate(20deg); opacity: 0; }
      to   { transform: scale(1) rotate(0deg); opacity: 1; }
    }

    @keyframes iconGlow {
      0%, 100% { box-shadow: 0 0 20px rgba(239,68,68,0.4); }
      50% { box-shadow: 0 0 50px rgba(239,68,68,0.7), 0 0 80px rgba(249,115,22,0.3); }
    }

    /* X icon draw animation */
    .icon-circle svg {
      width: 44px; height: 44px;
      stroke: white; stroke-width: 2.5;
      fill: none;
      stroke-linecap: round;
    }

    .icon-circle svg line:nth-child(1) {
      stroke-dasharray: 25;
      stroke-dashoffset: 25;
      animation: drawLine 0.3s ease 1.3s forwards;
    }

    .icon-circle svg line:nth-child(2) {
      stroke-dasharray: 25;
      stroke-dashoffset: 25;
      animation: drawLine 0.3s ease 1.5s forwards;
    }

    @keyframes drawLine { to { stroke-dashoffset: 0; } }

    /* ── Badge ── */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04));
      border: 1px solid rgba(239,68,68,0.25);
      color: var(--red-light);
      font-size: 10.5px;
      font-weight: 600;
      padding: 5px 15px;
      border-radius: 50px;
      margin-bottom: 18px;
      letter-spacing: 1.8px;
      text-transform: uppercase;
      opacity: 0;
      animation: fadeSlideUp 0.5s ease 1.5s forwards;
    }

    .badge-dot {
      width: 6px; height: 6px;
      background: var(--red);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--red);
      animation: blink 1.5s ease infinite 2s;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.3; transform: scale(0.7); }
    }

    /* ── Text ── */
    h1 {
      font-family: 'Syne', sans-serif;
      font-size: 34px;
      font-weight: 800;
      color: #fff;
      line-height: 1.15;
      margin-bottom: 14px;
      letter-spacing: -1.2px;
      opacity: 0;
      animation: fadeSlideUp 0.5s ease 1.65s forwards;
    }

    h1 .gradient-text {
      background: linear-gradient(135deg, var(--red-light), var(--orange-light));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    p {
      font-size: 14.5px;
      color: rgba(255,255,255,0.35);
      line-height: 1.85;
      margin-bottom: 36px;
      font-weight: 400;
      opacity: 0;
      animation: fadeSlideUp 0.5s ease 1.8s forwards;
    }

    /* ── Reason box ── */
    .reason-box {
      background: rgba(239,68,68,0.06);
      border: 1px solid rgba(239,68,68,0.15);
      border-radius: 14px;
      padding: 18px 20px;
      margin-bottom: 32px;
      text-align: left;
      opacity: 0;
      animation: fadeSlideUp 0.5s ease 1.95s forwards;
    }

    .reason-title {
      font-size: 11px;
      font-weight: 600;
      color: rgba(239,68,68,0.7);
      letter-spacing: 1.2px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    .reason-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13.5px;
      color: rgba(255,255,255,0.4);
      padding: 5px 0;
    }

    .reason-item + .reason-item {
      border-top: 1px solid rgba(255,255,255,0.04);
    }

    .reason-item svg {
      width: 15px; height: 15px;
      stroke: rgba(239,68,68,0.6);
      stroke-width: 2;
      fill: none;
      flex-shrink: 0;
    }

    /* ── Buttons ── */
    .btn-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
      opacity: 0;
      animation: fadeSlideUp 0.5s ease 2.1s forwards;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: linear-gradient(135deg, #dc2626, #ef4444 50%, #f97316);
      color: white;
      text-decoration: none;
      padding: 15px 42px;
      border-radius: 14px;
      font-size: 14.5px;
      font-weight: 600;
      box-shadow:
        0 8px 32px rgba(239,68,68,0.4),
        inset 0 1px 0 rgba(255,255,255,0.18);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
    }

    .btn-primary::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
      opacity: 0;
      transition: opacity 0.3s;
    }

    .btn-primary:hover {
      transform: translateY(-3px) scale(1.02);
      box-shadow: 0 16px 48px rgba(239,68,68,0.55), inset 0 1px 0 rgba(255,255,255,0.2);
    }

    .btn-primary:hover::before { opacity: 1; }

    .btn-primary svg {
      width: 18px; height: 18px;
      stroke: white; stroke-width: 2.5;
      fill: none; stroke-linecap: round; stroke-linejoin: round;
      transition: transform 0.3s;
    }

    .btn-primary:hover svg { transform: rotate(-20deg); }

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.45);
      text-decoration: none;
      padding: 13px 42px;
      border-radius: 14px;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .btn-secondary:hover {
      background: rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.7);
      transform: translateY(-2px);
      border-color: rgba(255,255,255,0.14);
    }

    .btn-secondary svg {
      width: 16px; height: 16px;
      stroke: currentColor; stroke-width: 2;
      fill: none; stroke-linecap: round; stroke-linejoin: round;
    }

    /* ── Footer ── */
    .footer {
      margin-top: 30px;
      font-size: 11.5px;
      color: rgba(255,255,255,0.12);
      letter-spacing: 0.3px;
      opacity: 0;
      animation: fadeSlideUp 0.5s ease 2.2s forwards;
    }

    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Falling particles ── */
    .particle-wrap {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 1;
      overflow: hidden;
    }

    .fp {
      position: absolute;
      top: -10px;
      width: 3px; height: 3px;
      border-radius: 50%;
      animation: fall linear infinite;
      opacity: 0;
    }

    @keyframes fall {
      0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
      10%  { opacity: 0.6; }
      90%  { opacity: 0.3; }
      100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
    }
  </style>
</head>
<body>

  <canvas id="canvas"></canvas>
  <div class="mesh"></div>
  <div class="grid"></div>

  <!-- Falling particles -->
  <div class="particle-wrap" id="particleWrap"></div>

  <div class="card">
    <div class="icon-wrap">
      <div class="ring-outer"></div>
      <div class="ring-glow"></div>
      <div class="orbit">
        <div class="orbit-dot"></div>
        <div class="orbit-dot orange"></div>
      </div>
      <div class="icon-circle">
        <svg viewBox="0 0 24 24">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </div>
    </div>

    <div class="badge">
      <span class="badge-dot"></span>
      Payment Cancelled
    </div>

    <h1>Payment <span class="gradient-text">Cancelled</span></h1>
    <p>No worries — your card was not charged.<br/>You can try again anytime.</p>

    <div class="reason-box">
      <div class="reason-title">Common reasons</div>
      <div class="reason-item">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Card declined or insufficient funds
      </div>
      <div class="reason-item">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Session timed out or tab was closed
      </div>
      <div class="reason-item">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Payment was manually cancelled
      </div>
    </div>

    <div class="btn-group">
      <a href="#" class="btn-primary">
        <svg viewBox="0 0 24 24">
          <polyline points="1 4 1 10 7 10"/>
          <path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
        </svg>
        Try Again
      </a>
      <a href="#" class="btn-secondary">
        <svg viewBox="0 0 24 24">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        Back to Home
      </a>
    </div>

    <div class="footer">© 2025 Higgibod · All rights reserved</div>
  </div>

  <script>
    // ── Falling broken particles ───────────────────────────────────────────────
    const wrap = document.getElementById('particleWrap');
    const colors = ['rgba(239,68,68,0.5)', 'rgba(249,115,22,0.4)', 'rgba(248,113,113,0.4)', 'rgba(252,165,165,0.3)'];

    setTimeout(() => {
      for (let i = 0; i < 25; i++) {
        const p = document.createElement('div');
        p.className = 'fp';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.width = (Math.random() * 3 + 2) + 'px';
        p.style.height = p.style.width;
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.animationDuration = (Math.random() * 6 + 5) + 's';
        p.style.animationDelay = (Math.random() * 4) + 's';
        wrap.appendChild(p);
      }
    }, 800);

    // ── Canvas: shatter/crack effect ──────────────────────────────────────────
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const shards = [];

    class Shard {
      constructor() {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 1.5;
        this.x = cx;
        this.y = cy;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.size = Math.random() * 8 + 3;
        this.alpha = 0.7;
        this.decay = Math.random() * 0.015 + 0.008;
        this.gravity = 0.12;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.15;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        // triangle points
        this.points = [
          { x: 0, y: -this.size },
          { x: this.size * 0.8, y: this.size * 0.6 },
          { x: -this.size * 0.8, y: this.size * 0.6 },
        ];
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.vx *= 0.98;
        this.alpha -= this.decay;
        this.rotation += this.rotSpeed;
      }
      draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        ctx.lineTo(this.points[1].x, this.points[1].y);
        ctx.lineTo(this.points[2].x, this.points[2].y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    setTimeout(() => {
      for (let i = 0; i < 60; i++) {
        setTimeout(() => shards.push(new Shard()), i * 12);
      }
    }, 900);

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = shards.length - 1; i >= 0; i--) {
        shards[i].update();
        shards[i].draw();
        if (shards[i].alpha <= 0) shards.splice(i, 1);
      }
      requestAnimationFrame(animate);
    }

    animate();

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  </script>

</body>
</html>`);
};





// ─── Export ───────────────────────────────────────────────────────────────────
export const PaymentController = {
  createCheckoutSession,
  stripeWebhook,
  paymentSuccess,
  getMyPaymentHistory,
  getAllPaymentHistory,
  cancelSubscription,
  paymentCancel,
};