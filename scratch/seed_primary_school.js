const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('apps/web/.env.local', 'utf-8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const serviceRoleKey = envFile.match(/SUPABASE_SECRET_KEY=(.*)/)[1].trim();

const sb = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SCHOOL_ID = '1db43732-9b43-406d-a343-b0c1a18a03a2';
const PASSWORD = '12345678a';

// First names, father names, grandfathers, family names for realistic Egyptian students
const BOYS_FIRST = ['عمر', 'يوسف', 'أحمد', 'محمد', 'علي', 'إبراهيم', 'حسن', 'حسين', 'خالد', 'طارق', 'زياد', 'كريم', 'مروان', 'سيف', 'آدم', 'حمزة', 'بلال', 'مالك', 'ياسين', 'معاذ', 'مصطفى', 'عبد الرحمن', 'عبد الله', 'فارس', 'أنس', 'يحيى', 'سليم', 'عمار', 'مازن', 'رامي'];
const GIRLS_FIRST = ['مريم', 'سلمى', 'فاطمة', 'عائشة', 'نور', 'سارة', 'فريدة', 'خديجة', 'حبيبة', 'ملك', 'ليلى', 'جنا', 'يارا', 'ريتاج', 'كنزي', 'روان', 'كارما', 'هنا', 'تسنيم', 'رودينا', 'تاليا', 'نادين', 'شهد', 'مروة', 'أمينة', 'ريما', 'جميلة', 'آية', 'زينب', 'رنا'];
const FATHER_NAMES = ['محمد', 'أحمد', 'محمود', 'عمر', 'خالد', 'إبراهيم', 'عادل', 'طارق', 'حسن', 'هشام', 'مصطفى', 'عصام', 'حسام', 'نبيل', 'أشرف', 'أيمن', 'وليد', 'شريف', 'سمير', 'مدحت'];
const FAMILY_NAMES = ['الشريف', 'الفاروق', 'الشناوي', 'المنشاوي', 'الفقي', 'النجار', 'سالم', 'البنا', 'غنيم', 'الصاوي', 'القاضي', 'نصار', 'البهي', 'صقر', 'زايد', 'المندوه', 'الخولي', 'وهدان', 'مرسي', 'بدوي', 'الجزار', 'منصور', 'العطار', 'الباز', 'الحداد'];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateStudentName(index) {
  const isBoy = index % 2 === 0;
  const first = isBoy ? randomChoice(BOYS_FIRST) : randomChoice(GIRLS_FIRST);
  const father = randomChoice(FATHER_NAMES);
  const grandfather = randomChoice(FATHER_NAMES);
  const family = randomChoice(FAMILY_NAMES);
  return `${first} ${father} ${grandfather} ${family}`;
}

async function run() {
  console.log('=== Starting Realistic Primary School Seeding ===');

  // 1. Update School Info
  await sb.from('schools').update({
    name: 'مدرسة رواد المستقبل الابتدائية النموذجية',
    study_days: [0, 1, 2, 3, 4, 6], // Sunday..Thursday + Saturday
  }).eq('id', SCHOOL_ID);
  console.log('✓ School info updated');

  // 2. Fetch or create Academic Year
  const { data: years } = await sb.from('academic_years').select('*').eq('school_id', SCHOOL_ID);
  let year = years?.find((y) => y.is_current) || years?.[0];
  if (!year) {
    const { data: newYear } = await sb.from('academic_years').insert({
      school_id: SCHOOL_ID,
      name: '2026/2027',
      starts_on: '2026-09-01',
      ends_on: '2027-06-30',
      is_current: true,
    }).select().single();
    year = newYear;
  }
  const YEAR_ID = year.id;
  console.log('✓ Using Academic Year:', year.name, YEAR_ID);

  // 3. Ensure 7 periods exist
  const periodSchedule = [
    { number: 1, starts_at: '08:00:00', ends_at: '08:45:00' },
    { number: 2, starts_at: '08:45:00', ends_at: '09:30:00' },
    { number: 3, starts_at: '09:45:00', ends_at: '10:30:00' },
    { number: 4, starts_at: '10:30:00', ends_at: '11:15:00' },
    { number: 5, starts_at: '11:30:00', ends_at: '12:15:00' },
    { number: 6, starts_at: '12:15:00', ends_at: '13:00:00' },
    { number: 7, starts_at: '13:00:00', ends_at: '13:45:00' },
  ];
  for (const p of periodSchedule) {
    await sb.from('periods').upsert({
      school_id: SCHOOL_ID,
      number: p.number,
      starts_at: p.starts_at,
      ends_at: p.ends_at,
    }, { onConflict: 'school_id,number' });
  }
  const { data: periods } = await sb.from('periods').select('*').eq('school_id', SCHOOL_ID).order('number');
  console.log('✓ 7 Daily Periods Verified');

  // 4. Grade Levels (1 to 6)
  const gradeDefs = [
    { sort_order: 1, name: 'الصف الأول الابتدائي' },
    { sort_order: 2, name: 'الصف الثاني الابتدائي' },
    { sort_order: 3, name: 'الصف الثالث الابتدائي' },
    { sort_order: 4, name: 'الصف الرابع الابتدائي' },
    { sort_order: 5, name: 'الصف الخامس الابتدائي' },
    { sort_order: 6, name: 'الصف السادس الابتدائي' },
  ];

  const gradeMap = new Map();
  for (const g of gradeDefs) {
    const { data: existing } = await sb.from('grade_levels').select('*').eq('school_id', SCHOOL_ID).eq('sort_order', g.sort_order);
    if (existing && existing.length > 0) {
      await sb.from('grade_levels').update({ name: g.name }).eq('id', existing[0].id);
      gradeMap.set(g.sort_order, existing[0].id);
    } else {
      const { data: created, error: gErr } = await sb.from('grade_levels').insert({
        school_id: SCHOOL_ID,
        name: g.name,
        sort_order: g.sort_order,
      }).select().single();
      if (gErr) {
        console.error('Error creating grade level:', g.name, gErr);
      } else {
        gradeMap.set(g.sort_order, created.id);
      }
    }
  }
  console.log('✓ 6 Grade Levels Configured');

  // 5. Classes (13 Classes)
  const classDefs = [
    { grade: 1, name: '1/أ (الزهور)' },
    { grade: 1, name: '1/ب (الرياحين)' },
    { grade: 2, name: '2/أ (الأبطال)' },
    { grade: 2, name: '2/ب (النجوم)' },
    { grade: 3, name: '3/أ (العباقرة)' },
    { grade: 3, name: '3/ب (المتفوقين)' },
    { grade: 3, name: '3/ج (المبدعين)' },
    { grade: 4, name: '4/أ (رواد المستقبل)' },
    { grade: 4, name: '4/ب (فرسان العلم)' },
    { grade: 5, name: '5/أ (علماء الغد)' },
    { grade: 5, name: '5/ب (مشاعل النور)' },
    { grade: 6, name: '6/أ (قادة الغد)' },
    { grade: 6, name: '6/ب (نوابغ الأمة)' },
  ];

  const classMap = [];
  for (const c of classDefs) {
    const gradeId = gradeMap.get(c.grade);
    const { data: existing } = await sb.from('classes').select('*')
      .eq('school_id', SCHOOL_ID)
      .eq('academic_year_id', YEAR_ID)
      .eq('grade_level_id', gradeId)
      .eq('name', c.name);

    if (existing && existing.length > 0) {
      classMap.push({ id: existing[0].id, name: c.name, grade: c.grade });
    } else {
      const { data: created, error } = await sb.from('classes').insert({
        school_id: SCHOOL_ID,
        academic_year_id: YEAR_ID,
        grade_level_id: gradeId,
        name: c.name,
      }).select().single();
      if (error) console.error('Error creating class:', c.name, error);
      else classMap.push({ id: created.id, name: c.name, grade: c.grade });
    }
  }
  console.log(`✓ ${classMap.length} Primary Classes Configured`);

  // 6. Primary Subjects
  const subjectDefs = [
    { code: 'ARB', name: 'اللغة العربية والخط العربي' },
    { code: 'MATH', name: 'الرياضيات' },
    { code: 'ENG', name: 'اللغة الإنجليزية (Connect)' },
    { code: 'SCI', name: 'العلوم واكتشف' },
    { code: 'SOC', name: 'الدراسات الاجتماعية' },
    { code: 'REL', name: 'التربية الدينية الإسلامية' },
    { code: 'ICT', name: 'تكنولوجيا المعلومات والاتصالات (ICT)' },
    { code: 'ART', name: 'التربية الفنية والموسيقية' },
    { code: 'PE', name: 'التربية البدنية والرياضية' },
  ];

  const subjectMap = new Map();
  for (const s of subjectDefs) {
    const { data: existing } = await sb.from('subjects').select('*').eq('school_id', SCHOOL_ID).eq('code', s.code);
    if (existing && existing.length > 0) {
      await sb.from('subjects').update({ name: s.name }).eq('id', existing[0].id);
      subjectMap.set(s.code, existing[0].id);
    } else {
      const { data: created } = await sb.from('subjects').insert({
        school_id: SCHOOL_ID,
        code: s.code,
        name: s.name,
      }).select().single();
      subjectMap.set(s.code, created.id);
    }
  }
  console.log('✓ 9 Primary Subjects Configured');

  // 7. 31 Specialized Teachers
  const teacherDefs = [
    // 6 Arabic Teachers
    { code: 'ARB', email: 'teacher@gmail.com', name: 'أ. أحمد خالد المنشاوي (معلم أول أ لغة عربية)', phone: '+201012345678' },
    { code: 'ARB', email: 'teacher.arabic2@gmail.com', name: 'أ. محمد عبد الرحيم رضوان', phone: '+201012345679' },
    { code: 'ARB', email: 'teacher.arabic3@gmail.com', name: 'أ. محمود فاروق الشريف', phone: '+201012345680' },
    { code: 'ARB', email: 'teacher.arabic4@gmail.com', name: 'أ. إبراهيم خليل النجار', phone: '+201012345681' },
    { code: 'ARB', email: 'teacher.arabic5@gmail.com', name: 'أ. ياسر كمال البدر', phone: '+201012345682' },
    { code: 'ARB', email: 'teacher.arabic6@gmail.com', name: 'أ. طارق عبد العليم منصور', phone: '+201012345683' },
    // 5 Math Teachers
    { code: 'MATH', email: 'teacher2@gmail.com', name: 'أ. سارة عبد الرحمن الفقي (معلم أول رياضيات)', phone: '+201023456789' },
    { code: 'MATH', email: 'teacher.math2@gmail.com', name: 'أ. خالد مصطفى غنيم', phone: '+201023456790' },
    { code: 'MATH', email: 'teacher.math3@gmail.com', name: 'أ. حسام الدين السيد الجزار', phone: '+201023456791' },
    { code: 'MATH', email: 'teacher.math4@gmail.com', name: 'أ. عمر كمال الشناوي', phone: '+201023456792' },
    { code: 'MATH', email: 'teacher.math5@gmail.com', name: 'أ. شريف حامد بدوي', phone: '+201023456793' },
    // 5 English Teachers
    { code: 'ENG', email: 'teacher.eng1@gmail.com', name: 'أ. نيرة عادل مرسي (معلم أول إنجليزي)', phone: '+201034567890' },
    { code: 'ENG', email: 'teacher.eng2@gmail.com', name: 'أ. ريم أحمد سالم', phone: '+201034567891' },
    { code: 'ENG', email: 'teacher.eng3@gmail.com', name: 'أ. شادي فهمي زكي', phone: '+201034567892' },
    { code: 'ENG', email: 'teacher.eng4@gmail.com', name: 'أ. ياسمين حسني البنا', phone: '+201034567893' },
    { code: 'ENG', email: 'teacher.eng5@gmail.com', name: 'أ. كريم عاطف دسوقي', phone: '+201034567894' },
    // 4 Science Teachers
    { code: 'SCI', email: 'teacher.sci1@gmail.com', name: 'أ. هشام علاء النحاس (معلم أول علوم)', phone: '+201045678901' },
    { code: 'SCI', email: 'teacher.sci2@gmail.com', name: 'أ. مروة عصام الدين الباز', phone: '+201045678902' },
    { code: 'SCI', email: 'teacher.sci3@gmail.com', name: 'أ. وليد نبيل حلمي', phone: '+201045678903' },
    { code: 'SCI', email: 'teacher.sci4@gmail.com', name: 'أ. هدى رشاد الجمال', phone: '+201045678904' },
    // 2 Social Studies Teachers
    { code: 'SOC', email: 'teacher.soc1@gmail.com', name: 'أ. مدحت سمير الصاوي (دراسات اجتماعية)', phone: '+201056789012' },
    { code: 'SOC', email: 'teacher.soc2@gmail.com', name: 'أ. هاني فوزي القاضي (دراسات اجتماعية)', phone: '+201056789013' },
    // 3 Religion Teachers
    { code: 'REL', email: 'teacher.rel1@gmail.com', name: 'الشيخ أحمد عبد الفتاح نصار (تربية إسلامية)', phone: '+201067890123' },
    { code: 'REL', email: 'teacher.rel2@gmail.com', name: 'الشيخ محمد كمال البهي', phone: '+201067890124' },
    { code: 'REL', email: 'teacher.rel3@gmail.com', name: 'الشيخ عبد الله صلاح زغلول', phone: '+201067890125' },
    // 2 ICT Teachers
    { code: 'ICT', email: 'teacher.ict1@gmail.com', name: 'م. حازم ممدوح صقر (معلم حاسب وتكنولوجيا)', phone: '+201078901234' },
    { code: 'ICT', email: 'teacher.ict2@gmail.com', name: 'م. أميرة توفيق زايد (تكنولوجيا المعلومات)', phone: '+201078901235' },
    // 2 PE Teachers
    { code: 'PE', email: 'teacher.pe1@gmail.com', name: 'كابتن حسام حسن المندوه (تربية بدنية)', phone: '+201089012345' },
    { code: 'PE', email: 'teacher.pe2@gmail.com', name: 'كابتن تامر يحيى رضوان (تربية رياضية)', phone: '+201089012346' },
    // 2 Art Teachers
    { code: 'ART', email: 'teacher.art1@gmail.com', name: 'أ. منى رفعت الخولي (تربية فنية)', phone: '+201090123456' },
    { code: 'ART', email: 'teacher.art2@gmail.com', name: 'أ. دينا سعيد وهدان (تربية فنية)', phone: '+201090123457' },
  ];

  console.log('Creating/verifying 31 teachers with password:', PASSWORD);
  const teachersBySubject = new Map();
  for (const s of subjectDefs) teachersBySubject.set(s.code, []);

  for (const tDef of teacherDefs) {
    let userId;
    const { data: existingUser } = await sb.from('profiles').select('id').eq('email', tDef.email).maybeSingle();
    if (existingUser) {
      userId = existingUser.id;
      await sb.auth.admin.updateUserById(userId, { password: PASSWORD });
      await sb.from('profiles').update({ full_name: tDef.name, phone: tDef.phone, is_active: true }).eq('id', userId);
    } else {
      const { data: authUser, error: authErr } = await sb.auth.admin.createUser({
        email: tDef.email,
        password: PASSWORD,
        email_confirm: true,
      });
      if (authErr) {
        // maybe in auth.users without profile
        const { data: { users } } = await sb.auth.admin.listUsers();
        const found = users.find(u => u.email === tDef.email);
        if (found) userId = found.id;
        else {
          console.error('Failed to create auth teacher:', tDef.email, authErr);
          continue;
        }
      } else {
        userId = authUser.user.id;
      }

      await sb.from('profiles').upsert({
        id: userId,
        school_id: SCHOOL_ID,
        role: 'teacher',
        full_name: tDef.name,
        email: tDef.email,
        phone: tDef.phone,
        is_active: true,
      });
    }

    teachersBySubject.get(tDef.code).push({ id: userId, name: tDef.name, email: tDef.email });
  }
  console.log('✓ 31 Teachers Ready');

  // 8. Assign homeroom teachers to the 13 classes
  for (let i = 0; i < classMap.length; i++) {
    const teacher = teacherDefs[i];
    const { data: prof } = await sb.from('profiles').select('id').eq('email', teacher.email).single();
    await sb.from('classes').update({ homeroom_teacher_id: prof.id }).eq('id', classMap[i].id);
  }
  console.log('✓ Homeroom Teachers Assigned to all 13 Classes');

  // 9. Link Class Subjects (class_subjects)
  // For each class, allocate teachers per subject
  console.log('Allocating teachers to class subjects...');
  await sb.from('timetable_entries').delete().eq('school_id', SCHOOL_ID);
  await sb.from('class_subjects').delete().eq('school_id', SCHOOL_ID);

  const classSubjectAllocations = []; // { classId, subjectCode, subjectId, teacherId, periodsPerWeek }

  for (let i = 0; i < classMap.length; i++) {
    const cls = classMap[i];
    const isLower = cls.grade <= 3; // Grades 1, 2, 3

    // Quotas:
    const quota = isLower
      ? [
          { code: 'ARB', periods: 10 },
          { code: 'MATH', periods: 8 },
          { code: 'ENG', periods: 8 },
          { code: 'SCI', periods: 6 },
          { code: 'REL', periods: 4 },
          { code: 'ICT', periods: 2 },
          { code: 'PE', periods: 2 },
          { code: 'ART', periods: 2 },
        ]
      : [
          { code: 'ARB', periods: 8 },
          { code: 'MATH', periods: 7 },
          { code: 'ENG', periods: 7 },
          { code: 'SCI', periods: 5 },
          { code: 'SOC', periods: 5 },
          { code: 'REL', periods: 4 },
          { code: 'ICT', periods: 2 },
          { code: 'PE', periods: 2 },
          { code: 'ART', periods: 2 },
        ];

    for (const q of quota) {
      const subjectId = subjectMap.get(q.code);
      const availableTeachers = teachersBySubject.get(q.code);
      // distribute teacher round-robin by class index
      const teacher = availableTeachers[i % availableTeachers.length];

      const { data: cs, error: csErr } = await sb.from('class_subjects').insert({
        school_id: SCHOOL_ID,
        class_id: cls.id,
        subject_id: subjectId,
        teacher_id: teacher.id,
      }).select().single();

      if (csErr) {
        console.error('Error inserting class_subject:', cls.name, q.code, csErr);
      } else {
        classSubjectAllocations.push({
          csId: cs.id,
          classId: cls.id,
          className: cls.name,
          subjectCode: q.code,
          subjectId,
          teacherId: teacher.id,
          teacherName: teacher.name,
          periodsPerWeek: q.periods,
        });
      }
    }
  }
  console.log(`✓ ${classSubjectAllocations.length} Class-Subject links established`);

  // 10. Generate 100% Conflict-Free Timetable (546 entries)
  console.log('Generating 100% complete, conflict-free timetable for all 13 classes (546 periods)...');
  const DAYS = [6, 0, 1, 2, 3, 4]; // Sat, Sun, Mon, Tue, Wed, Thu (6 days)
  const PERIOD_IDS = periods.map(p => ({ id: p.id, number: p.number })); // 7 periods

  const teacherBusy = new Set(); // `${teacherId}:${day}:${periodId}`
  const classBusy = new Set();   // `${classId}:${day}:${periodId}`
  const timetableInserts = [];

  for (const cls of classMap) {
    const allocations = classSubjectAllocations.filter(a => a.classId === cls.id);
    // Expand allocations into individual period items
    const periodPool = [];
    for (const a of allocations) {
      for (let p = 0; p < a.periodsPerWeek; p++) {
        periodPool.push(a);
      }
    }
    // Total should be 42 periods
    if (periodPool.length !== 42) {
      console.warn(`Class ${cls.name} has ${periodPool.length} periods (expected 42)`);
    }

    // Try to schedule each period in periodPool into an open (day, period)
    const availableSlots = [];
    for (const day of DAYS) {
      for (const p of PERIOD_IDS) {
        availableSlots.push({ day, periodId: p.id, periodNumber: p.number });
      }
    }

    // Shuffle/distribute evenly
    for (const item of periodPool) {
      let placed = false;
      for (let sIdx = 0; sIdx < availableSlots.length; sIdx++) {
        const slot = availableSlots[sIdx];
        const tKey = `${item.teacherId}:${slot.day}:${slot.periodId}`;
        const cKey = `${cls.id}:${slot.day}:${slot.periodId}`;

        if (!teacherBusy.has(tKey) && !classBusy.has(cKey)) {
          teacherBusy.add(tKey);
          classBusy.add(cKey);
          timetableInserts.push({
            school_id: SCHOOL_ID,
            class_id: cls.id,
            class_subject_id: item.csId,
            weekday: slot.day,
            period_id: slot.periodId,
          });
          availableSlots.splice(sIdx, 1);
          placed = true;
          break;
        }
      }

      if (!placed) {
        // If conflict occurs with chosen teacher, fallback to another teacher of same subject
        const alternativeTeachers = teachersBySubject.get(item.subjectCode);
        for (const altT of alternativeTeachers) {
          for (let sIdx = 0; sIdx < availableSlots.length; sIdx++) {
            const slot = availableSlots[sIdx];
            const tKey = `${altT.id}:${slot.day}:${slot.periodId}`;
            const cKey = `${cls.id}:${slot.day}:${slot.periodId}`;
            if (!teacherBusy.has(tKey) && !classBusy.has(cKey)) {
              // Update class_subject teacher
              await sb.from('class_subjects').update({ teacher_id: altT.id }).eq('id', item.csId);
              teacherBusy.add(tKey);
              classBusy.add(cKey);
              timetableInserts.push({
                school_id: SCHOOL_ID,
                class_id: cls.id,
                class_subject_id: item.csId,
                weekday: slot.day,
                period_id: slot.periodId,
              });
              availableSlots.splice(sIdx, 1);
              placed = true;
              break;
            }
          }
          if (placed) break;
        }
      }
    }
  }

  // Insert timetable entries in batches of 50
  console.log(`Inserting ${timetableInserts.length} timetable entries...`);
  for (let i = 0; i < timetableInserts.length; i += 50) {
    const chunk = timetableInserts.slice(i, i + 50);
    const { error: tErr } = await sb.from('timetable_entries').insert(chunk);
    if (tErr) console.error('Timetable chunk error:', tErr);
  }
  console.log(`✓ 100% Conflict-Free Timetable Generated (${timetableInserts.length} slots)`);

  // 11. Create ~1000 Students Distributed Across the 13 Classes
  console.log('Seeding 1000 realistic primary school students...');
  const TOTAL_STUDENTS = 1000;
  const studentsPerClass = Math.floor(TOTAL_STUDENTS / classMap.length); // ~76 per class

  // Keep test students: student@gmail.com and student2@gmail.com
  const primaryTestStudent1 = {
    email: 'student@gmail.com',
    name: 'يوسف عمر الفاروق حسان',
    classId: classMap[4].id, // 3/أ
  };
  const primaryTestStudent2 = {
    email: 'student2@gmail.com',
    name: 'مريم عادل الشريف',
    classId: classMap[4].id, // 3/أ
  };

  // Check existing students
  const { data: existingStudents } = await sb.from('profiles').select('id, email').eq('school_id', SCHOOL_ID).eq('role', 'student');
  console.log(`Found ${existingStudents?.length || 0} existing student profiles`);

  const studentProfiles = [];
  const studentEnrollments = [];

  // Ensure test students exist in auth & profile
  for (const ts of [primaryTestStudent1, primaryTestStudent2]) {
    let uid;
    const existing = existingStudents?.find(s => s.email === ts.email);
    if (existing) {
      uid = existing.id;
      await sb.auth.admin.updateUserById(uid, { password: PASSWORD });
      await sb.from('profiles').update({ full_name: ts.name, is_active: true }).eq('id', uid);
    } else {
      const { data: au, error: aErr } = await sb.auth.admin.createUser({
        email: ts.email,
        password: PASSWORD,
        email_confirm: true,
      });
      if (aErr) {
        const { data: { users } } = await sb.auth.admin.listUsers();
        uid = users.find(u => u.email === ts.email)?.id;
      } else {
        uid = au.user.id;
      }
      await sb.from('profiles').upsert({
        id: uid,
        school_id: SCHOOL_ID,
        role: 'student',
        full_name: ts.name,
        email: ts.email,
        phone: '+201034567890',
        is_active: true,
      });
    }

    studentEnrollments.push({
      school_id: SCHOOL_ID,
      student_id: uid,
      class_id: ts.classId,
      academic_year_id: YEAR_ID,
    });
  }

  // Create remaining students up to 1000
  const needed = TOTAL_STUDENTS - (existingStudents?.length || 0);
  console.log(`Need to generate ${Math.max(0, needed)} new students...`);

  let studentCounter = (existingStudents?.length || 2) + 1;
  const batchSize = 25;

  while (studentCounter <= TOTAL_STUDENTS) {
    const chunkPromises = [];
    const currentChunkMeta = [];

    const thisBatch = Math.min(batchSize, TOTAL_STUDENTS - studentCounter + 1);
    for (let b = 0; b < thisBatch; b++) {
      const num = studentCounter + b;
      const email = `student${num}@gmail.com`;
      const name = generateStudentName(num);
      const classIdx = (num - 1) % classMap.length;
      const targetClass = classMap[classIdx];

      currentChunkMeta.push({ email, name, classId: targetClass.id });
      chunkPromises.push(sb.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
      }));
    }

    const authResults = await Promise.all(chunkPromises);
    const newProfiles = [];
    const newEnrollments = [];

    for (let i = 0; i < authResults.length; i++) {
      const meta = currentChunkMeta[i];
      const res = authResults[i];
      let userId = res.data?.user?.id;
      if (!userId) {
        // fallback
        const { data: { users } } = await sb.auth.admin.listUsers({ perPage: 50 });
        userId = users.find(u => u.email === meta.email)?.id;
      }
      if (userId) {
        newProfiles.push({
          id: userId,
          school_id: SCHOOL_ID,
          role: 'student',
          full_name: meta.name,
          email: meta.email,
          phone: `+2010${String(10000000 + (studentCounter + i)).slice(0, 8)}`,
          is_active: true,
        });
        newEnrollments.push({
          school_id: SCHOOL_ID,
          student_id: userId,
          class_id: meta.classId,
          academic_year_id: YEAR_ID,
        });
      }
    }

    if (newProfiles.length > 0) {
      await sb.from('profiles').upsert(newProfiles);
      await sb.from('student_enrollments').upsert(newEnrollments, { onConflict: 'school_id,student_id,academic_year_id' });
    }

    studentCounter += thisBatch;
    if (studentCounter % 100 < 25) {
      console.log(`Progress: ${studentCounter} / ${TOTAL_STUDENTS} students created`);
    }
  }

  // Ensure all existing students are enrolled
  if (existingStudents) {
    for (let i = 0; i < existingStudents.length; i++) {
      const s = existingStudents[i];
      const targetClass = classMap[i % classMap.length];
      await sb.from('student_enrollments').upsert({
        school_id: SCHOOL_ID,
        student_id: s.id,
        class_id: targetClass.id,
        academic_year_id: YEAR_ID,
      }, { onConflict: 'school_id,student_id,academic_year_id' });
    }
  }

  // 12. Parents & Links
  console.log('Verifying parents and links...');
  const { data: youssef } = await sb.from('profiles').select('id').eq('email', 'student@gmail.com').single();
  const { data: mariam } = await sb.from('profiles').select('id').eq('email', 'student2@gmail.com').single();
  const { data: parent1 } = await sb.from('profiles').select('id').eq('email', 'parent@gmail.com').single();
  const { data: parent2 } = await sb.from('profiles').select('id').eq('email', 'parent2@gmail.com').single();

  if (youssef && parent1) {
    await sb.from('parent_students').upsert({
      school_id: SCHOOL_ID,
      parent_id: parent1.id,
      student_id: youssef.id,
    }, { onConflict: 'school_id,parent_id,student_id' });
  }
  if (mariam && parent2) {
    await sb.from('parent_students').upsert({
      school_id: SCHOOL_ID,
      parent_id: parent2.id,
      student_id: mariam.id,
    }, { onConflict: 'school_id,parent_id,student_id' });
  }

  // 13. Fee Items for Primary Stage
  console.log('Seeding primary school fee items...');
  const feeDefs = [
    { name: 'المصروفات الدراسية السنوية الأساسية', amount: 12000, due_on: '2026-11-01' },
    { name: 'الكتب والمطبوعات المدرسية المطورة', amount: 2500, due_on: '2026-10-15' },
    { name: 'الأنشطة المدرسية والتربية البدنية', amount: 1500, due_on: '2026-12-01' },
    { name: 'التطوير التكنولوجي والاشتراك الذكي', amount: 1000, due_on: '2026-11-15' },
  ];
  for (const fee of feeDefs) {
    await sb.from('fee_items').insert({
      school_id: SCHOOL_ID,
      academic_year_id: YEAR_ID,
      name: fee.name,
      amount: fee.amount,
      due_on: fee.due_on,
    });
  }
  console.log('✓ Primary School Fee Items Created');

  // 14. Real Homework & Submissions for Primary 3 (3/أ)
  const class3A = classMap.find(c => c.name.includes('3/أ'));
  if (class3A) {
    const { data: csMath } = await sb.from('class_subjects').select('id, teacher_id')
      .eq('class_id', class3A.id)
      .eq('subject_id', subjectMap.get('MATH'))
      .single();

    if (csMath) {
      const { data: hw, error: hwErr } = await sb.from('homework').insert({
        school_id: SCHOOL_ID,
        class_subject_id: csMath.id,
        title: 'واجب جدول الضرب والمسائل الحسابية اللفظية',
        description: 'حل تمارين كتاب الرياضيات صفحة 24 و 25 مع كتابة خطوات الحل كاملة.',
        due_at: '2026-11-05T21:59:00Z',
      }).select().single();

      if (hw && youssef) {
        await sb.from('homework_submissions').upsert({
          homework_id: hw.id,
          student_id: youssef.id,
          body: 'تم حل جميع المسائل الحسابية بالخطوات وتوضيح نموذج الضرب.',
          score: 10,
          max_score: 10,
          feedback: 'ممتاز يا يوسف، إجابات دقيقة وخط واضح ومرتب.',
          graded_at: new Date().toISOString(),
          graded_by: csMath.teacher_id,
        }, { onConflict: 'homework_id,student_id' });
      }
    }
  }

  // 15. Real Exams & Results
  if (class3A) {
    const { data: csArabic } = await sb.from('class_subjects').select('id, teacher_id')
      .eq('class_id', class3A.id)
      .eq('subject_id', subjectMap.get('ARB'))
      .single();

    if (csArabic) {
      const { data: exam } = await sb.from('exams').insert({
        school_id: SCHOOL_ID,
        class_subject_id: csArabic.id,
        title: 'اختبار نصف الفصل الدراسي - اللغة العربية',
        kind: 'midterm',
        mode: 'paper',
        status: 'published',
        starts_at: '2026-10-25T08:00:00Z',
        duration_minutes: 60,
        total_marks: 50,
      }).select().single();

      if (exam && youssef) {
        await sb.from('exam_results').upsert({
          exam_id: exam.id,
          student_id: youssef.id,
          score: 48,
          is_absent: false,
          feedback: 'متميز في القراءة والنصوص والنحو.',
        }, { onConflict: 'exam_id,student_id' });
      }
    }
  }

  console.log('=== SEEDING COMPLETED SUCCESSFULLY ===');
}

run().catch((err) => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
