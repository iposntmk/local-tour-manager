ALTER TABLE public.tours
DROP CONSTRAINT IF EXISTS tours_guide_id_fkey;

ALTER TABLE public.tours
ADD CONSTRAINT tours_guide_id_fkey
FOREIGN KEY (guide_id)
REFERENCES public.guides(id)
ON DELETE SET NULL;
