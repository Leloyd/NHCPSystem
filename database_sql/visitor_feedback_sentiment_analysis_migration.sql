-- Adds stored automated sentiment results to visitor feedback.
-- Run once in the Supabase SQL Editor before deploying the sentiment dashboard.

begin;

alter table public.visitor_feedback
  add column if not exists sentiment_label text,
  add column if not exists sentiment_confidence numeric(5, 4),
  add column if not exists sentiment_scores jsonb not null default '{}'::jsonb,
  add column if not exists sentiment_model text not null default '',
  add column if not exists sentiment_provider text not null default '',
  add column if not exists sentiment_analyzed_at timestamp with time zone;

alter table public.visitor_feedback
  drop constraint if exists visitor_feedback_sentiment_label_check;

alter table public.visitor_feedback
  add constraint visitor_feedback_sentiment_label_check
  check (sentiment_label is null or sentiment_label in ('positive', 'neutral', 'negative'));

alter table public.visitor_feedback
  drop constraint if exists visitor_feedback_sentiment_confidence_check;

alter table public.visitor_feedback
  add constraint visitor_feedback_sentiment_confidence_check
  check (sentiment_confidence is null or (sentiment_confidence >= 0 and sentiment_confidence <= 1));

create index if not exists visitor_feedback_sentiment_label_idx
  on public.visitor_feedback (sentiment_label);

commit;
