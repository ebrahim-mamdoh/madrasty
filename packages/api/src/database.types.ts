export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      academic_years: {
        Row: {
          created_at: string
          ends_on: string
          id: string
          is_current: boolean
          name: string
          school_id: string
          starts_on: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          id?: string
          is_current?: boolean
          name: string
          school_id: string
          starts_on: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          id?: string
          is_current?: boolean
          name?: string
          school_id?: string
          starts_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_years_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_years_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          note: string | null
          recorded_by: string | null
          school_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          id?: string
          note?: string | null
          recorded_by?: string | null
          school_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          recorded_by?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_class_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "attendance_records_recorded_by_school_id_fkey"
            columns: ["recorded_by", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "attendance_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_school_id_fkey"
            columns: ["student_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      class_subjects: {
        Row: {
          class_id: string
          created_at: string
          id: string
          school_id: string
          subject_id: string
          teacher_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          school_id: string
          subject_id: string
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          school_id?: string
          subject_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_subjects_class_id_school_id_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "class_subjects_subject_id_school_id_fkey"
            columns: ["subject_id", "school_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "class_subjects_teacher_id_school_id_fkey"
            columns: ["teacher_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year_id: string
          created_at: string
          grade_level_id: string
          homeroom_teacher_id: string | null
          id: string
          name: string
          school_id: string
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          grade_level_id: string
          homeroom_teacher_id?: string | null
          id?: string
          name: string
          school_id: string
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          grade_level_id?: string
          homeroom_teacher_id?: string | null
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_academic_year_id_school_id_fkey"
            columns: ["academic_year_id", "school_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "classes_grade_level_id_school_id_fkey"
            columns: ["grade_level_id", "school_id"]
            isOneToOne: false
            referencedRelation: "grade_levels"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "classes_homeroom_teacher_id_school_id_fkey"
            columns: ["homeroom_teacher_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          answers: Json
          auto_score: number | null
          exam_id: string
          id: string
          school_id: string
          started_at: string
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          answers?: Json
          auto_score?: number | null
          exam_id: string
          id?: string
          school_id: string
          started_at?: string
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          answers?: Json
          auto_score?: number | null
          exam_id?: string
          id?: string
          school_id?: string
          started_at?: string
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_fkey"
            columns: ["exam_id", "school_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "exam_attempts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_student_id_school_id_fkey"
            columns: ["student_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          correct_answer: Json | null
          created_at: string
          exam_id: string
          id: string
          options: Json
          points: number
          position: number
          school_id: string
          text: string
          type: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          correct_answer?: Json | null
          created_at?: string
          exam_id: string
          id?: string
          options?: Json
          points?: number
          position?: number
          school_id: string
          text: string
          type: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          correct_answer?: Json | null
          created_at?: string
          exam_id?: string
          id?: string
          options?: Json
          points?: number
          position?: number
          school_id?: string
          text?: string
          type?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_fkey"
            columns: ["exam_id", "school_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "exam_questions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_results: {
        Row: {
          exam_id: string
          id: string
          note: string | null
          recorded_by: string | null
          school_id: string
          score: number
          student_id: string
          updated_at: string
        }
        Insert: {
          exam_id: string
          id?: string
          note?: string | null
          recorded_by?: string | null
          school_id: string
          score: number
          student_id: string
          updated_at?: string
        }
        Update: {
          exam_id?: string
          id?: string
          note?: string | null
          recorded_by?: string | null
          school_id?: string
          score?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_exam_fkey"
            columns: ["exam_id", "school_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "exam_results_recorded_by_school_id_fkey"
            columns: ["recorded_by", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "exam_results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_student_id_school_id_fkey"
            columns: ["student_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      exams: {
        Row: {
          class_id: string
          class_subject_id: string
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          instructions: string
          kind: Database["public"]["Enums"]["exam_kind"]
          max_score: number
          mode: Database["public"]["Enums"]["exam_mode"]
          published_at: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string
          starts_at: string
          status: Database["public"]["Enums"]["exam_status"]
          title: string
          updated_at: string
        }
        Insert: {
          class_id: string
          class_subject_id: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          instructions?: string
          kind: Database["public"]["Enums"]["exam_kind"]
          max_score: number
          mode?: Database["public"]["Enums"]["exam_mode"]
          published_at?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["exam_status"]
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          class_subject_id?: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          instructions?: string
          kind?: Database["public"]["Enums"]["exam_kind"]
          max_score?: number
          mode?: Database["public"]["Enums"]["exam_mode"]
          published_at?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["exam_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_class_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "exams_class_subject_fkey"
            columns: ["class_subject_id", "class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "class_subjects"
            referencedColumns: ["id", "class_id", "school_id"]
          },
          {
            foreignKeyName: "exams_created_by_school_id_fkey"
            columns: ["created_by", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "exams_reviewed_by_school_id_fkey"
            columns: ["reviewed_by", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      features: {
        Row: {
          key: string
          sort_order: number
        }
        Insert: {
          key: string
          sort_order?: number
        }
        Update: {
          key?: string
          sort_order?: number
        }
        Relationships: []
      }
      grade_levels: {
        Row: {
          created_at: string
          id: string
          name: string
          school_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "grade_levels_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_levels_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          attachments: Json
          body: string
          class_id: string
          class_subject_id: string
          created_at: string
          created_by: string | null
          due_at: string
          id: string
          max_score: number | null
          missing_notified_at: string | null
          school_id: string
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          body?: string
          class_id: string
          class_subject_id: string
          created_at?: string
          created_by?: string | null
          due_at: string
          id?: string
          max_score?: number | null
          missing_notified_at?: string | null
          school_id: string
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          body?: string
          class_id?: string
          class_subject_id?: string
          created_at?: string
          created_by?: string | null
          due_at?: string
          id?: string
          max_score?: number | null
          missing_notified_at?: string | null
          school_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_class_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "homework_class_subject_fkey"
            columns: ["class_subject_id", "class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "class_subjects"
            referencedColumns: ["id", "class_id", "school_id"]
          },
          {
            foreignKeyName: "homework_created_by_school_id_fkey"
            columns: ["created_by", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "homework_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          attachments: Json
          body: string
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          homework_id: string
          id: string
          school_id: string
          score: number | null
          student_id: string
          submitted_at: string
        }
        Insert: {
          attachments?: Json
          body?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          homework_id: string
          id?: string
          school_id: string
          score?: number | null
          student_id: string
          submitted_at?: string
        }
        Update: {
          attachments?: Json
          body?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          homework_id?: string
          id?: string
          school_id?: string
          score?: number | null
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_graded_by_school_id_fkey"
            columns: ["graded_by", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "homework_submissions_homework_fkey"
            columns: ["homework_id", "school_id"]
            isOneToOne: false
            referencedRelation: "homework"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "homework_submissions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submissions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submissions_student_id_school_id_fkey"
            columns: ["student_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      monthly_reports: {
        Row: {
          academic_note: string
          author_id: string | null
          behavior_note: string
          class_id: string
          created_at: string
          id: string
          month: string
          ratings: Json
          school_id: string
          sent_at: string | null
          sent_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          academic_note?: string
          author_id?: string | null
          behavior_note?: string
          class_id: string
          created_at?: string
          id?: string
          month: string
          ratings?: Json
          school_id: string
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          academic_note?: string
          author_id?: string | null
          behavior_note?: string
          class_id?: string
          created_at?: string
          id?: string
          month?: string
          ratings?: Json
          school_id?: string
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reports_author_id_school_id_fkey"
            columns: ["author_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "monthly_reports_class_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "monthly_reports_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_reports_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_reports_sent_by_school_id_fkey"
            columns: ["sent_by", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "monthly_reports_student_id_school_id_fkey"
            columns: ["student_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json
          id: string
          kind: string
          read_at: string | null
          recipient_id: string
          school_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          kind: string
          read_at?: string | null
          recipient_id: string
          school_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          kind?: string
          read_at?: string | null
          recipient_id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_school_id_fkey"
            columns: ["recipient_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_students: {
        Row: {
          created_at: string
          parent_id: string
          relation: string | null
          school_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          parent_id: string
          relation?: string | null
          school_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          parent_id?: string
          relation?: string | null
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_students_parent_id_school_id_fkey"
            columns: ["parent_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "parent_students_student_id_school_id_fkey"
            columns: ["student_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      periods: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          number: number
          school_id: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          number: number
          school_id: string
          starts_at: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          number?: number
          school_id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "periods_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periods_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          key: string
          module: string
        }
        Insert: {
          key: string
          module: string
        }
        Update: {
          key?: string
          module?: string
        }
        Relationships: []
      }
      profile_permissions: {
        Row: {
          permission_key: string
          profile_id: string
          school_id: string
        }
        Insert: {
          permission_key: string
          profile_id: string
          school_id: string
        }
        Update: {
          permission_key?: string
          profile_id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "profile_permissions_profile_id_school_id_fkey"
            columns: ["profile_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      profile_staff_roles: {
        Row: {
          profile_id: string
          role_id: string
          school_id: string
        }
        Insert: {
          profile_id: string
          role_id: string
          school_id: string
        }
        Update: {
          profile_id?: string
          role_id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_staff_roles_profile_id_school_id_fkey"
            columns: ["profile_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "profile_staff_roles_role_id_school_id_fkey"
            columns: ["role_id", "school_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          school_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          role: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      question_bank: {
        Row: {
          correct_answer: Json | null
          created_at: string
          created_by: string | null
          id: string
          options: Json
          points: number
          school_id: string
          subject_id: string
          text: string
          type: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          correct_answer?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          options?: Json
          points?: number
          school_id: string
          subject_id: string
          text: string
          type: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          correct_answer?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          options?: Json
          points?: number
          school_id?: string
          subject_id?: string
          text?: string
          type?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_created_by_school_id_fkey"
            columns: ["created_by", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "question_bank_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_subject_fkey"
            columns: ["subject_id", "school_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      school_features: {
        Row: {
          enabled_at: string
          feature_key: string
          school_id: string
        }
        Insert: {
          enabled_at?: string
          feature_key: string
          school_id: string
        }
        Update: {
          enabled_at?: string
          feature_key?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_features_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "school_features_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_features_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          id: string
          locale: string
          logo_path: string | null
          name: string
          primary_color: string
          secondary_color: string
          slug: string
          status: Database["public"]["Enums"]["school_status"]
          study_days: number[]
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          locale?: string
          logo_path?: string | null
          name: string
          primary_color?: string
          secondary_color?: string
          slug: string
          status?: Database["public"]["Enums"]["school_status"]
          study_days?: number[]
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          locale?: string
          logo_path?: string | null
          name?: string
          primary_color?: string
          secondary_color?: string
          slug?: string
          status?: Database["public"]["Enums"]["school_status"]
          study_days?: number[]
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_role_permissions: {
        Row: {
          permission_key: string
          role_id: string
          school_id: string
        }
        Insert: {
          permission_key: string
          role_id: string
          school_id: string
        }
        Update: {
          permission_key?: string
          role_id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "staff_role_permissions_role_id_school_id_fkey"
            columns: ["role_id", "school_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      staff_roles: {
        Row: {
          created_at: string
          id: string
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      student_enrollments: {
        Row: {
          academic_year_id: string
          class_id: string
          enrolled_at: string
          id: string
          school_id: string
          student_id: string
        }
        Insert: {
          academic_year_id: string
          class_id: string
          enrolled_at?: string
          id?: string
          school_id: string
          student_id: string
        }
        Update: {
          academic_year_id?: string
          class_id?: string
          enrolled_at?: string
          id?: string
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_enrollments_class_id_academic_year_id_fkey"
            columns: ["class_id", "academic_year_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "academic_year_id"]
          },
          {
            foreignKeyName: "student_enrollments_class_id_school_id_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "student_enrollments_student_id_school_id_fkey"
            columns: ["student_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
          school_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
          school_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_entries: {
        Row: {
          class_id: string
          class_subject_id: string
          created_at: string
          id: string
          period_id: string
          school_id: string
          weekday: number
        }
        Insert: {
          class_id: string
          class_subject_id: string
          created_at?: string
          id?: string
          period_id: string
          school_id: string
          weekday: number
        }
        Update: {
          class_id?: string
          class_subject_id?: string
          created_at?: string
          id?: string
          period_id?: string
          school_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "timetable_entries_class_subject_fkey"
            columns: ["class_subject_id", "class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "class_subjects"
            referencedColumns: ["id", "class_id", "school_id"]
          },
          {
            foreignKeyName: "timetable_entries_period_fkey"
            columns: ["period_id", "school_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "timetable_entries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_overview"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      schools_overview: {
        Row: {
          created_at: string | null
          id: string | null
          name: string | null
          slug: string | null
          status: Database["public"]["Enums"]["school_status"] | null
          students_count: number | null
          teachers_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["school_status"] | null
          students_count?: never
          teachers_count?: never
        }
        Update: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["school_status"] | null
          students_count?: never
          teachers_count?: never
        }
        Relationships: []
      }
    }
    Functions: {
      admin_dashboard: { Args: never; Returns: Json }
      attendance_summary: {
        Args: { p_class_id: string; p_from: string; p_to: string }
        Returns: {
          absent: number
          excused: number
          full_name: string
          late: number
          present: number
          student_id: string
        }[]
      }
      class_teachers: {
        Args: { p_class_id: string }
        Returns: {
          full_name: string
          id: string
        }[]
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      exam_transition: {
        Args: { p_action: string; p_exam_id: string; p_note?: string }
        Returns: Database["public"]["Enums"]["exam_status"]
      }
      homework_overview: {
        Args: { p_class_id?: string }
        Returns: {
          graded: number
          homework_id: string
          students: number
          submitted: number
        }[]
      }
      my_permissions: { Args: never; Returns: string[] }
      platform_stats: {
        Args: never
        Returns: {
          schools_active: number
          schools_total: number
          students_total: number
          teachers_total: number
        }[]
      }
      send_monthly_reports: { Args: { p_ids: string[] }; Returns: number }
      set_current_academic_year: {
        Args: { p_year_id: string }
        Returns: undefined
      }
      set_school_features: {
        Args: { p_features: string[]; p_school_id: string }
        Returns: undefined
      }
      set_school_study_days: { Args: { p_days: number[] }; Returns: undefined }
      start_exam: { Args: { p_exam_id: string }; Returns: Json }
      submit_exam: {
        Args: { p_answers: Json; p_exam_id: string }
        Returns: number
      }
      teacher_dashboard: { Args: never; Returns: Json }
      teacher_monitoring: {
        Args: never
        Returns: {
          attendance_days: number
          classes: number
          exams_unpublished: number
          full_name: string
          last_attendance_at: string
          reports_pending: number
          teacher_id: string
          ungraded: number
        }[]
      }
      update_school_settings: {
        Args: {
          p_logo_path?: string
          p_name: string
          p_primary_color: string
          p_remove_logo?: boolean
          p_secondary_color: string
          p_timezone: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "school_admin"
        | "staff"
        | "teacher"
        | "student"
        | "parent"
      attendance_status: "present" | "absent" | "late" | "excused"
      exam_kind: "monthly" | "midterm" | "final" | "quiz"
      exam_mode: "paper" | "online"
      exam_status: "draft" | "pending" | "approved" | "published"
      question_type: "mcq" | "true_false" | "short"
      report_status: "draft" | "sent"
      school_status: "active" | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "school_admin",
        "staff",
        "teacher",
        "student",
        "parent",
      ],
      attendance_status: ["present", "absent", "late", "excused"],
      exam_kind: ["monthly", "midterm", "final", "quiz"],
      exam_mode: ["paper", "online"],
      exam_status: ["draft", "pending", "approved", "published"],
      question_type: ["mcq", "true_false", "short"],
      report_status: ["draft", "sent"],
      school_status: ["active", "suspended"],
    },
  },
} as const
