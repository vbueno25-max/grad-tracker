const supabaseUrl = 'https://xpxmvhqlszjdrlakwwnm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhweG12aHFsc3pqZHJsYWt3d25tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2OTI0MDMsImV4cCI6MjA5ODI2ODQwM30.rVHL4GRBqhclier3sgCJ4PZziOTnE-KWsYOjWCJE8uY';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

window.PREDEFINED_EMPHASES = [
    "Direito das Políticas Públicas e da Regulação",
    "Direito das Relações Privadas e dos Negócios",
    "Direito da Tutela Penal",
    "Direitos Humanos"
];

const PREDEFINED_CLINICS = [
    { name: "Clínica de Prática Jurídica Direito, Mídia e Jornalismo", emphasis: "" },
    { name: "Oficina de Técnicas de Negociação", emphasis: "" },
    { name: "Oficina de Técnicas Contratuais", emphasis: "Direito das Relações Privadas e dos Negócios" },
    { name: "Oficina de Regulação Econômica", emphasis: "Direito das Políticas Públicas e da Regulação" },
    { name: "Oficina de Processo Judicial Eletrônico", emphasis: "" },
    { name: "Oficina de Processo Tributário", emphasis: "" },
    { name: "Oficina de Processo Penal III – Júri Simulado", emphasis: "Direito da Tutela Penal" },
    { name: "Oficina de Processo Penal II – Recursos", emphasis: "Direito da Tutela Penal" },
    { name: "Oficina de Processo Penal I – Ação Penal e Defesa", emphasis: "Direito da Tutela Penal" },
    { name: "Oficina de Processo do Trabalho", emphasis: "" },
    { name: "Oficina de Processo Constitucional", emphasis: "Direito das Políticas Públicas e da Regulação" },
    { name: "Oficina de Processo Civil II – recursos", emphasis: "Direito das Relações Privadas e dos Negócios" },
    { name: "Oficina de Processo Civil I – primeira instância", emphasis: "Direito das Relações Privadas e dos Negócios" },
    { name: "Oficina de Processo Administrativo", emphasis: "Direito das Políticas Públicas e da Regulação" },
    { name: "Oficina de Oralidade no Processo Penal", emphasis: "Direito da Tutela Penal" },
    { name: "Oficina de Mediação e Conciliação", emphasis: "Direito das Relações Privadas e dos Negócios" },
    { name: "Oficina de Execução Penal", emphasis: "Direito da Tutela Penal" },
    { name: "Oficina de Consultivo Tributário", emphasis: "" },
    { name: "Oficina de Avaliação e Produção Legislativa", emphasis: "Direito das Políticas Públicas e da Regulação" },
    { name: "Oficina de arbitragem", emphasis: "Direito das Relações Privadas e dos Negócios" },
    { name: "Oficina de Advocacy", emphasis: "" },
    { name: "Assessoria Jurídica em Tutela Penal", emphasis: "Direito da Tutela Penal" },
    { name: "Assessoria Jurídica em Direito dos Negócios", emphasis: "Direito das Relações Privadas e dos Negócios" },
    { name: "Assessoria Jurídica em Direitos Humanos", emphasis: "Direitos Humanos" },
    { name: "Assessoria Jurídica em Direito e Políticas Públicas", emphasis: "Direito das Políticas Públicas e da Regulação" },
    { name: "Oficina de Estruturação Jurídica dos Negócios", emphasis: "Direito das Relações Privadas e dos Negócios" },
    { name: "Oficina de Contencioso Empresarial", emphasis: "Direito das Relações Privadas e dos Negócios" },
    { name: "Oficina de Processo Civil III – Advocacia nos Tribunais Superiores", emphasis: "Direito das Relações Privadas e dos Negócios" }
];

class StoreService {
    constructor() {
        this.data = {
            subjectBoxes: [], subjects: [], clinics: [],
            compBox: { targetHours: 0 }, extBox: { targetHours: 0 },
            compActivities: [], extActivities: []
        };
    }

    async init() {
        await this._loadFromSupabase();
        await this._seedClinics();
    }

    async _loadFromSupabase() {
        const [sb, sub, cli, act, cfg] = await Promise.all([
            supabaseClient.from('subject_boxes').select('*'),
            supabaseClient.from('subjects').select('*'),
            supabaseClient.from('clinics').select('*'),
            supabaseClient.from('activities').select('*'),
            supabaseClient.from('boxes_config').select('*')
        ]);
        
        this.data.subjectBoxes = sb.data || [];
        this.data.subjects = sub.data || [];
        this.data.clinics = cli.data || [];
        
        const activities = act.data || [];
        this.data.compActivities = activities.filter(a => a.type === 'comp');
        this.data.extActivities = activities.filter(a => a.type === 'ext');

        const config = cfg.data || [];
        const compConf = config.find(c => c.id === 'comp');
        const extConf = config.find(c => c.id === 'ext');
        if(compConf) this.data.compBox.targetHours = compConf.targetHours;
        if(extConf) this.data.extBox.targetHours = extConf.targetHours;
    }

    async _seedClinics() {
        if (this.data.clinics.length === 0) {
            const newClinics = PREDEFINED_CLINICS.map(c => ({
                name: c.name,
                emphasisCategory: c.emphasis,
                emphasis: c.emphasis ? 'sim' : 'nao',
                hours: 120,
                status: 'pendente',
                completionSemester: null,
                professor: '', dayOfWeek: '', time: '', cloudLink: '', notebookLink: ''
            }));
            const { data } = await supabaseClient.from('clinics').insert(newClinics).select();
            if(data) this.data.clinics = data;
        }
    }

    // --- Subject Boxes ---
    async getSubjectBoxes() { return this.data.subjectBoxes; }
    async addSubjectBox(boxData) {
        const { data } = await supabaseClient.from('subject_boxes').insert([boxData]).select();
        if(data && data[0]) this.data.subjectBoxes.push(data[0]);
    }
    async updateSubjectBox(id, boxData) {
        const { data } = await supabaseClient.from('subject_boxes').update(boxData).eq('id', id).select();
        if(data && data[0]) {
            const index = this.data.subjectBoxes.findIndex(b => b.id === id);
            this.data.subjectBoxes[index] = data[0];
        }
    }
    async deleteSubjectBox(id) {
        await supabaseClient.from('subject_boxes').delete().eq('id', id);
        this.data.subjectBoxes = this.data.subjectBoxes.filter(b => b.id !== id);
        this.data.subjects = this.data.subjects.filter(s => s.boxId !== id);
    }

    // --- Subjects ---
    async getSubjects(boxId = null) {
        if (boxId) return this.data.subjects.filter(s => s.boxId === boxId);
        return this.data.subjects;
    }
    async addSubject(subjectData) {
        // Ensure empty numbers are null for DB integer columns
        if(subjectData.completionSemester === '') subjectData.completionSemester = null;
        if(subjectData.idealSemester === '') subjectData.idealSemester = null;

        const { data } = await supabaseClient.from('subjects').insert([subjectData]).select();
        if(data && data[0]) this.data.subjects.push(data[0]);
    }
    async updateSubject(id, subjectData) {
        if(subjectData.completionSemester === '') subjectData.completionSemester = null;
        if(subjectData.idealSemester === '') subjectData.idealSemester = null;

        const { data } = await supabaseClient.from('subjects').update(subjectData).eq('id', id).select();
        if(data && data[0]) {
            const index = this.data.subjects.findIndex(s => s.id === id);
            this.data.subjects[index] = data[0];
        }
    }
    async deleteSubject(id) {
        await supabaseClient.from('subjects').delete().eq('id', id);
        this.data.subjects = this.data.subjects.filter(s => s.id !== id);
    }

    // --- Clinics ---
    async getClinics() { return this.data.clinics; }
    async addClinic(clinicData) {
        if(clinicData.completionSemester === '') clinicData.completionSemester = null;
        const { data } = await supabaseClient.from('clinics').insert([clinicData]).select();
        if(data && data[0]) this.data.clinics.push(data[0]);
    }
    async updateClinic(id, clinicData) {
        if(clinicData.completionSemester === '') clinicData.completionSemester = null;
        const { data } = await supabaseClient.from('clinics').update(clinicData).eq('id', id).select();
        if(data && data[0]) {
            const index = this.data.clinics.findIndex(c => c.id === id);
            this.data.clinics[index] = data[0];
        }
    }
    async deleteClinic(id) {
        await supabaseClient.from('clinics').delete().eq('id', id);
        this.data.clinics = this.data.clinics.filter(c => c.id !== id);
    }

    // --- Boxes (Comp / Ext) ---
    async getCompBox() { return this.data.compBox; }
    async updateCompBox(hours) {
        await supabaseClient.from('boxes_config').update({ targetHours: Number(hours) }).eq('id', 'comp');
        this.data.compBox.targetHours = Number(hours);
    }
    async getExtBox() { return this.data.extBox; }
    async updateExtBox(hours) {
        await supabaseClient.from('boxes_config').update({ targetHours: Number(hours) }).eq('id', 'ext');
        this.data.extBox.targetHours = Number(hours);
    }

    // --- Activities ---
    async getActivities(type) {
        if (type === 'comp') return this.data.compActivities;
        if (type === 'ext') return this.data.extActivities;
        return [];
    }
    async addActivity(type, activityData) {
        activityData.type = type;
        const { data } = await supabaseClient.from('activities').insert([activityData]).select();
        if(data && data[0]) {
            if(type === 'comp') this.data.compActivities.push(data[0]);
            if(type === 'ext') this.data.extActivities.push(data[0]);
        }
    }
    async updateActivity(type, id, activityData) {
        const { data } = await supabaseClient.from('activities').update(activityData).eq('id', id).select();
        if(data && data[0]) {
            const list = type === 'comp' ? this.data.compActivities : this.data.extActivities;
            const index = list.findIndex(a => a.id === id);
            list[index] = data[0];
        }
    }
    async deleteActivity(type, id) {
        await supabaseClient.from('activities').delete().eq('id', id);
        if (type === 'comp') this.data.compActivities = this.data.compActivities.filter(a => a.id !== id);
        if (type === 'ext') this.data.extActivities = this.data.extActivities.filter(a => a.id !== id);
    }

    // --- Aggregations & Emphasis Logic ---
    async getEmphasisStats() {
        const stats = {};
        window.PREDEFINED_EMPHASES.forEach(cat => {
            stats[cat] = { subjectsCount: 0, compHours: 0, extHours: 0, clinicsCount: 0, status: 'Pendente' };
        });

        this.data.subjects.forEach(s => {
            if (s.emphasis === 'sim' && s.emphasisCategory && s.status === 'concluida') {
                if (stats[s.emphasisCategory]) stats[s.emphasisCategory].subjectsCount += 1;
            }
        });

        this.data.compActivities.forEach(a => {
            if (a.emphasis === 'sim' && a.emphasisCategory) {
                if (stats[a.emphasisCategory]) stats[a.emphasisCategory].compHours += Number(a.hours || 0);
            }
        });

        this.data.extActivities.forEach(a => {
            if (a.emphasis === 'sim' && a.emphasisCategory) {
                if (stats[a.emphasisCategory]) stats[a.emphasisCategory].extHours += Number(a.hours || 0);
            }
        });

        this.data.clinics.forEach(c => {
            if (c.emphasis === 'sim' && c.emphasisCategory && c.status === 'concluida') {
                if (stats[c.emphasisCategory]) stats[c.emphasisCategory].clinicsCount += 1;
            }
        });

        Object.keys(stats).forEach(cat => {
            const data = stats[cat];
            const totalActivityHours = data.compHours + data.extHours;
            if (data.subjectsCount >= 3 && data.clinicsCount >= 1 && totalActivityHours >= 60) {
                data.status = 'Concluída';
            }
        });

        return stats;
    }
}

window.store = new StoreService();