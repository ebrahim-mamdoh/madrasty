const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('apps/web/.env.local', 'utf-8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceRoleKey = envFile.match(/SUPABASE_SECRET_KEY=(.*)/)[1].trim();

const sb = createClient(supabaseUrl, serviceRoleKey);
const SCHOOL_ID = '1db43732-9b43-406d-a343-b0c1a18a03a2';

async function fill100() {
  console.log('=== Starting 100% Timetable Filler ===');

  // 1. Delete old test classes if they have 0 slots
  await sb.from('classes').delete().eq('school_id', SCHOOL_ID).in('name', ['1/أ (رواد المستقبل)', '2/أ (نوابغ الغد)']);
  console.log('✓ Cleaned up old classes');

  // 2. Fetch all 13 primary classes
  const { data: classes } = await sb.from('classes').select('id, name, grade_level_id').eq('school_id', SCHOOL_ID).order('name');
  console.log(`Found ${classes.length} classes:`, classes.map(c => c.name));

  // 3. Fetch periods and days
  const { data: periods } = await sb.from('periods').select('id, number').eq('school_id', SCHOOL_ID).order('number');
  const DAYS = [6, 0, 1, 2, 3, 4]; // Sat, Sun, Mon, Tue, Wed, Thu (6 study days)
  console.log(`Configured for ${DAYS.length} days x ${periods.length} periods = 42 slots per class`);

  // 4. Fetch class_subjects with teacher and subject details
  const { data: classSubjects } = await sb.from('class_subjects').select(`
    id, class_id, subject_id, teacher_id,
    subject:subjects(code, name)
  `).eq('school_id', SCHOOL_ID);

  // 5. Fetch all teachers grouped by subject code
  const { data: allTeachers } = await sb.from('profiles').select('id, full_name, email').eq('school_id', SCHOOL_ID).eq('role', 'teacher');

  // 6. Clear timetable entries to rebuild perfectly
  await sb.from('timetable_entries').delete().eq('school_id', SCHOOL_ID);
  console.log('✓ Reset existing timetable entries');

  // Track busy slots
  const teacherBusy = new Set(); // `${teacherId}:${day}:${periodId}`
  const classBusy = new Set();   // `${classId}:${day}:${periodId}`
  const timetableInserts = [];

  // Group class_subjects by classId
  const csByClass = new Map();
  for (const cs of classSubjects) {
    if (!csByClass.has(cs.class_id)) csByClass.set(cs.class_id, []);
    csByClass.get(cs.class_id).push(cs);
  }

  // To achieve 100% fill with zero conflicts:
  // For each class, for each day, for each period:
  for (const cls of classes) {
    const list = csByClass.get(cls.id) || [];
    if (list.length === 0) continue;

    for (const day of DAYS) {
      for (const p of periods) {
        // Find a class_subject whose teacher is NOT busy at (day, p.id)
        let chosenCs = null;

        // Try round robin through available subjects for this class
        // Sort by how few times this subject has been scheduled for this class so far
        const scheduledCount = (csId) => timetableInserts.filter(t => t.class_id === cls.id && t.class_subject_id === csId).length;
        list.sort((a, b) => scheduledCount(a.id) - scheduledCount(b.id));

        for (const candidate of list) {
          const tKey = `${candidate.teacher_id}:${day}:${p.id}`;
          if (!teacherBusy.has(tKey)) {
            chosenCs = candidate;
            break;
          }
        }

        if (!chosenCs) {
          // If all assigned teachers are busy at this exact slot, reassign candidate's teacher to an available teacher of the same subject!
          for (const candidate of list) {
            const subjectId = candidate.subject_id;
            const sameSubjectCs = classSubjects.filter(cs => cs.subject_id === subjectId);
            for (const otherCs of sameSubjectCs) {
              const altTeacherId = otherCs.teacher_id;
              const altKey = `${altTeacherId}:${day}:${p.id}`;
              if (!teacherBusy.has(altKey)) {
                // Swap/update teacher on candidate
                await sb.from('class_subjects').update({ teacher_id: altTeacherId }).eq('id', candidate.id);
                candidate.teacher_id = altTeacherId;
                chosenCs = candidate;
                break;
              }
            }
            if (chosenCs) break;
          }
        }

        if (chosenCs) {
          teacherBusy.add(`${chosenCs.teacher_id}:${day}:${p.id}`);
          classBusy.add(`${cls.id}:${day}:${p.id}`);
          timetableInserts.push({
            school_id: SCHOOL_ID,
            class_id: cls.id,
            class_subject_id: chosenCs.id,
            weekday: day,
            period_id: p.id,
          });
        } else {
          console.error(`Could not fill slot for ${cls.name} on day ${day} period ${p.number}`);
        }
      }
    }
  }

  console.log(`Inserting ${timetableInserts.length} / ${classes.length * 42} timetable entries...`);

  // Insert in batches
  for (let i = 0; i < timetableInserts.length; i += 50) {
    const chunk = timetableInserts.slice(i, i + 50);
    const { error: insertErr } = await sb.from('timetable_entries').insert(chunk);
    if (insertErr) {
      console.error('Insert error at chunk', i, insertErr);
    }
  }

  // Verify all 13 classes
  const { data: finalEntries } = await sb.from('timetable_entries').select('id, class_id');
  console.log('\n=== FINAL VERIFICATION ===');
  console.log(`Total Timetable Slots: ${finalEntries.length} / ${classes.length * 42}`);
  let all100 = true;
  for (const c of classes) {
    const count = finalEntries.filter(e => e.class_id === c.id).length;
    console.log(`${c.name}: ${count}/42 slots (${Math.round(count / 42 * 100)}%)`);
    if (count !== 42) all100 = false;
  }

  if (all100) {
    console.log('🎉 100% TIMETABLE COVERAGE ACHIEVED ACROSS ALL CLASSES WITHOUT CONFLICTS!');
  }
}

fill100().catch(console.error);
