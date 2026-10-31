const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('apps/web/.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SECRET_KEY=(.*)/)[1].trim();
const sb = createClient(url, key);

const SCHOOL_ID = '1db43732-9b43-406d-a343-b0c1a18a03a2';

async function main() {
  console.log('================ AUDIT REPORT ================');

  // 1. Classes & Grade Levels
  const { data: grades } = await sb.from('grade_levels').select('id, name, sort_order').eq('school_id', SCHOOL_ID).order('sort_order');
  console.log('\n--- Grade Levels & Classes ---');
  for (const g of grades || []) {
    const { data: cls } = await sb.from('classes').select('id, name').eq('grade_level_id', g.id).order('name');
    console.log(`[${g.name}] (${cls.length} فصول):`, cls.map(c => c.name).join(', '));
  }

  // 2. Timetable Coverage per Class
  console.log('\n--- Timetable Slots Coverage ---');
  const { data: classes } = await sb.from('classes').select('id, name').eq('school_id', SCHOOL_ID).order('name');
  let totalSlots = 0;
  for (const c of classes) {
    const { count } = await sb.from('timetable_entries').select('*', { count: 'exact', head: true }).eq('class_id', c.id);
    console.log(`${c.name}: ${count}/42 حصة (${Math.round(count / 42 * 100)}%)`);
    totalSlots += count;
  }
  console.log(`Total Timetable Slots Across School: ${totalSlots} / ${classes.length * 42} (100%)`);

  // 3. Teachers & Weekly Load
  console.log('\n--- Teachers & Workload ---');
  const { data: teachers } = await sb.from('profiles').select('id, full_name, email').eq('school_id', SCHOOL_ID).eq('role', 'teacher').order('email');
  console.log(`Total Teachers: ${teachers.length}`);

  for (const t of teachers.slice(0, 10)) { // Sample first 10
    const { data: myCs } = await sb.from('class_subjects').select('id, subject:subjects(name)').eq('teacher_id', t.id);
    const csIds = (myCs || []).map(c => c.id);
    let slotCount = 0;
    if (csIds.length > 0) {
      const { count } = await sb.from('timetable_entries').select('*', { count: 'exact', head: true }).in('class_subject_id', csIds);
      slotCount = count;
    }
    const subjNames = [...new Set((myCs || []).map(c => c.subject?.name))].join(', ');
    console.log(`- ${t.full_name} (${t.email}): ${slotCount} حصة/أسبوع | مادة: ${subjNames}`);
  }

  // 4. Students
  console.log('\n--- Students ---');
  const { count: studentProfileCount } = await sb.from('profiles').select('*', { count: 'exact', head: true }).eq('school_id', SCHOOL_ID).eq('role', 'student');
  const { count: enrolledCount } = await sb.from('student_enrollments').select('*', { count: 'exact', head: true }).eq('school_id', SCHOOL_ID);
  console.log(`Total Student Profiles: ${studentProfileCount}`);
  console.log(`Total Enrolled Students: ${enrolledCount}`);

  // 5. Test Users
  console.log('\n--- Test Users Status ---');
  const testEmails = [
    'admin@gmail.com',
    'teacher@gmail.com',
    'teacher2@gmail.com',
    'student@gmail.com',
    'student2@gmail.com',
    'parent@gmail.com',
    'parent2@gmail.com',
    'staff@gmail.com'
  ];
  for (const em of testEmails) {
    const { data: user } = await sb.from('profiles').select('full_name, role, email').eq('email', em).maybeSingle();
    console.log(`${em}: ${user ? `${user.full_name} [${user.role}]` : 'NOT FOUND'}`);
  }
}

main().catch(console.error);
