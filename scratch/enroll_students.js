const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('apps/web/.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SECRET_KEY=(.*)/)[1].trim();
const sb = createClient(url, key);

const SCHOOL_ID = '1db43732-9b43-406d-a343-b0c1a18a03a2';
const YEAR_ID = '65ede5d2-a079-48df-811c-7a4e2d017d7a';

async function enrollAll1000() {
  const { data: students } = await sb.from('profiles').select('id, email, full_name').eq('role', 'student').eq('school_id', SCHOOL_ID).order('email');
  console.log('Total students to enroll:', students.length);

  const { data: classes } = await sb.from('classes').select('id, name').eq('school_id', SCHOOL_ID).order('name');
  console.log('Target classes count:', classes.length);

  // Clear existing enrollments for this year to be 100% clean
  await sb.from('student_enrollments').delete().eq('school_id', SCHOOL_ID).eq('academic_year_id', YEAR_ID);

  const enrollments = [];
  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const targetClass = classes[i % classes.length];
    enrollments.push({
      school_id: SCHOOL_ID,
      student_id: s.id,
      class_id: targetClass.id,
      academic_year_id: YEAR_ID,
    });
  }

  // Insert in batches of 100
  for (let i = 0; i < enrollments.length; i += 100) {
    const chunk = enrollments.slice(i, i + 100);
    const { error } = await sb.from('student_enrollments').insert(chunk);
    if (error) console.error('Insert error at chunk', i, error);
  }

  // Verify
  const { count } = await sb.from('student_enrollments').select('*', { count: 'exact', head: true }).eq('academic_year_id', YEAR_ID);
  console.log('Total enrolled in year 2026/2027:', count);

  for (const c of classes) {
    const { count: cCount } = await sb.from('student_enrollments').select('*', { count: 'exact', head: true }).eq('class_id', c.id).eq('academic_year_id', YEAR_ID);
    console.log(`${c.name}: ${cCount} students`);
  }
}

enrollAll1000().catch(console.error);
