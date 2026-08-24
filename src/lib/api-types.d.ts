// ──────────────────────────────────────────────────────────────
// API entity types — derived from the backend's /website read shapes
// (the SELECT + normalization in neumAC-manage-back-end), NOT the Joi
// write schemas, because the frontend consumes the read shape.
//
// Import in a JS controller with JSDoc for editor checking:
//   /** @type {import('./api-types').ClinicalTrial[]} */
// ──────────────────────────────────────────────────────────────

export interface Coordinator {
  id: string;
  full_name: string;
  specialization: string | null;
  public_bio: string | null;
  public_photo_url: string | null;
  is_public: boolean;
}

export interface ResearchLine {
  id: string;
  line_number: number;
  name: string;
  short_name: string;
  description: string | null;
  capabilities: string | null;
  keywords: string[] | null;
  coordinator: Coordinator | null;
  active_trials: number;
  total_trials: number;
  active_projects: number;
}

export interface TrialLineRef {
  id?: string;
  line_number: number;
  name: string;
  short_name?: string;
}

export interface ClinicalTrial {
  id: string;
  protocol_id: string;
  title: string;
  phase: string;
  status: 'Reclutando' | 'Activo' | 'Completado' | 'En preparación' | 'Suspendido';
  research_line: TrialLineRef | null;
  additional_lines: TrialLineRef[];
  sponsor_name: string | null;
  nct_number: string | null;
  eudract_number: string | null;
  description: string | null;
}

export interface InnovationProject {
  id: string;
  title: string;
  category: 'Dispositivo' | 'Salud Digital' | 'IA / ML' | 'Tecnología Quirúrgica';
  development_stage: string | null;
  description: string;
  partner_needs: string[] | null;
  research_line: { name: string } | null;
}

export interface NewsPost {
  id: string;
  title: string;
  post_type: 'update' | 'article' | 'publication' | 'photo_story';
  body: string | null;
  featured_image_url: string | null;
  journal_name: string | null;
  authors_text: string | null;
  doi: string | null;
  published_at: string | null;
}

export interface TeamMember {
  id: string;
  full_name: string;
  title: string | null;
  staff_type: string;
  specialization: string | null;
  public_bio: string | null;
  public_photo_url: string | null;
  is_public: boolean;
  is_chief_of_department: boolean;
  orcid_id: string | null;
  coordinates_line?: boolean;
}

export interface PublicStats {
  research_lines: number;
  active_studies: number;
  investigators: number;
  publications: number;
}
