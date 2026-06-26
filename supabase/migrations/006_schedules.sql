-- 006_schedules.sql
create table public.schedules (
    id uuid default gen_random_uuid() primary key,
    mentor_id uuid references public.users(id) on delete cascade not null,
    student_id uuid references public.users(id) on delete cascade, -- null means assigned to all students under this mentor
    title text not null,
    description text,
    start_time timestamp with time zone not null,
    end_time timestamp with time zone not null,
    color text default '#3b82f6',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS
alter table public.schedules enable row level security;

-- Policies

-- Mentors can view schedules they created
create policy "Mentors can view their created schedules"
    on public.schedules for select
    using ( auth.uid() = mentor_id );

-- Mentors can insert schedules they created
create policy "Mentors can insert schedules"
    on public.schedules for insert
    with check ( auth.uid() = mentor_id );

-- Mentors can update schedules they created
create policy "Mentors can update schedules"
    on public.schedules for update
    using ( auth.uid() = mentor_id )
    with check ( auth.uid() = mentor_id );

-- Mentors can delete schedules they created
create policy "Mentors can delete schedules"
    on public.schedules for delete
    using ( auth.uid() = mentor_id );

-- Students can view schedules assigned to them
create policy "Students can view assigned schedules"
    on public.schedules for select
    using (
        auth.uid() = student_id
        or
        (student_id is null and exists (
            select 1 from public.internship_placements
            where internship_placements.student_id = auth.uid()
            and internship_placements.mentor_id = public.schedules.mentor_id
            and internship_placements.status = 'active'
        ))
    );
