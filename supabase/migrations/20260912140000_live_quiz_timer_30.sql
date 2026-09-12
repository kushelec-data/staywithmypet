-- Fixed live-quiz question duration: 30 seconds, server-authoritative.
update public.quiz_questions set timer_seconds = 30;
alter table public.quiz_questions alter column timer_seconds set default 30;
