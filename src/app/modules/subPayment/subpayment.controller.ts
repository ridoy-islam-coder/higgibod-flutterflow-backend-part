// src/modules/payment/payment.controller.ts
import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { PromoCodeService } from '../PromoCode/promocode.service';
import { PaymentService } from './subpayment.service';


// Promo code validate করো (checkout এ apply বাটনে)
const validatePromo = catchAsync(async (req: Request, res: Response) => {
  const { code, planId } = req.body;
  const result = await PromoCodeService.validatePromoCode(code, planId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Promo code validated',
    data: result,
  });
});

// Free trial activate (promo = 100% free)
const activateTrial = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const { planId, promoCodeId, trialDays } = req.body;

  const result = await PaymentService.activateFreeTrial(
    userId, planId, promoCodeId, trialDays,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});







// Stripe Webhook
// const stripeWebhook = catchAsync(async (req: Request, res: Response) => {
//   const signature = req.headers['stripe-signature'] as string;
//   const result = await PaymentService.handleStripeWebhook(req.body, signature);
//   res.json(result);
// });















// payment.controller.ts
const createCheckout = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id.toString();
  const { planId, promoCodeId } = req.body;

  const result = await PaymentService.createCheckoutSession(
    userId,
    planId,
    promoCodeId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Checkout session created',
    data: result,
  });
});



// ─── Payment Cancel ───────────────────────────────────────────────────────────
const paymentCancel = catchAsync(async (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Payment Cancelled</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f0f0f;
          font-family: 'Segoe UI', sans-serif;
        }

        .card {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 24px;
          padding: 48px 40px;
          max-width: 440px;
          width: 90%;
          text-align: center;
        }

        .icon-wrap {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #ff4444, #cc0000);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          animation: pop 0.4s ease;
        }

        @keyframes pop {
          0%   { transform: scale(0); opacity: 0; }
          80%  { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }

        .icon-wrap svg {
          width: 40px;
          height: 40px;
          fill: none;
          stroke: #fff;
          stroke-width: 3;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        h1 { color: #fff; font-size: 24px; font-weight: 700; margin-bottom: 12px; }
        p  { color: #888; font-size: 15px; line-height: 1.6; }

        .btn {
          display: block;
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #FFB400, #FF8C00);
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          margin-top: 28px;
          text-decoration: none;
          transition: opacity 0.2s;
        }

        .btn:hover { opacity: 0.88; }
      </style>
    </head>
    <body>
      <div class="card">

        <!-- ❌ Icon -->
        <div class="icon-wrap">
          <svg viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </div>

        <h1>Payment Cancelled</h1>
        <p>Your payment was not completed.<br/>Please try again.</p>

        <a class="btn" href="javascript:history.back()">Try Again</a>

      </div>
    </body>
    </html>
  `);
});







// ─── Payment Success (Stripe auto redirect করবে) ─────────────────────────────

// ─── Payment Success (Stripe auto redirect করবে) ─────────────────────────────
const paymentSuccess = catchAsync(async (req: Request, res: Response) => {
  const { session_id } = req.query;

  const result = await PaymentService.handlePaymentSuccess(
    session_id as string,
  );

  // ─── HTML Page Return ────────────────────────────────────────────
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Payment Successful</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f0f0f;
          font-family: 'Segoe UI', sans-serif;
        }

        .card {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 24px;
          padding: 48px 40px;
          max-width: 440px;
          width: 90%;
          text-align: center;
          box-shadow: 0 0 60px rgba(255, 180, 0, 0.08);
        }

        .icon-wrap {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #FFB400, #FF8C00);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          animation: pop 0.4s ease;
        }

        @keyframes pop {
          0%   { transform: scale(0); opacity: 0; }
          80%  { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }

        .icon-wrap svg {
          width: 40px;
          height: 40px;
          fill: none;
          stroke: #fff;
          stroke-width: 3;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        h1 {
          color: #ffffff;
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        p {
          color: #888;
          font-size: 15px;
          line-height: 1.6;
          margin-bottom: 8px;
        }

        .divider {
          height: 1px;
          background: #2a2a2a;
          margin: 28px 0;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .info-row span:first-child {
          color: #666;
          font-size: 14px;
        }

        .info-row span:last-child {
          color: #fff;
          font-size: 14px;
          font-weight: 600;
        }

        .badge {
          display: inline-block;
          background: rgba(255, 180, 0, 0.12);
          color: #FFB400;
          border: 1px solid rgba(255, 180, 0, 0.3);
          border-radius: 20px;
          padding: 4px 14px;
          font-size: 13px;
          font-weight: 600;
        }

        .btn {
          display: block;
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #FFB400, #FF8C00);
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          margin-top: 28px;
          text-decoration: none;
          transition: opacity 0.2s;
        }

        .btn:hover { opacity: 0.88; }

        .footer {
          color: #444;
          font-size: 12px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="card">

        <!-- ✅ Icon -->
        <div class="icon-wrap">
          <svg viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>

        <!-- Title -->
        <h1>Payment Successful!</h1>
        <p>Your subscription has been activated.<br/>Thank you for subscribing!</p>

        <div class="divider"></div>

        <!-- Info -->
        <div class="info-row">
          <span>Status</span>
          <span class="badge">✓ Active</span>
        </div>

        <div class="info-row">
          <span>Plan</span>
          <span>${result.planId}</span>
        </div>

        <div class="info-row">
          <span>Expires At</span>
          <span>${new Date(result.expiresAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}</span>
        </div>

        <div class="info-row">
          <span>Session ID</span>
          <span style="font-size:11px; color:#555;">${result.sessionId.slice(0, 20)}...</span>
        </div>

        <!-- Button -->
        <a class="btn" href="#">Open App</a>

        <p class="footer">
          A confirmation has been sent to your email.
        </p>

      </div>
    </body>
    </html>
  `);
});







export const PaymentController = {
  validatePromo,
  activateTrial,
//stripeWebhook,
createCheckout,
  paymentCancel,
  paymentSuccess,
};