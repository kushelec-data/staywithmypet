-- Fixed live-quiz question duration: 25 seconds, server-authoritative.
update public.quiz_questions
set timer_seconds = 25;

alter table public.quiz_questions
alter column timer_seconds set default 25;
