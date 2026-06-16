-- Bulk-close settlement & mark paid via bank transfer for all tours.
-- Updates every tour's settlement_status to 'closed', payment_status to 'paid',
-- and last_payment_method to 'bank_transfer'.

UPDATE public.tours
SET settlement_status  = 'closed',
    payment_status     = 'paid',
    last_payment_method = 'bank_transfer',
    locked_at          = COALESCE(locked_at, now()),
    updated_at         = now()
WHERE settlement_status IS NOT NULL;
