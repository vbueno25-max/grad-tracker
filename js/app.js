// ---- Navigation ----
document.getElementById('sidebar-nav').addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-btn');
    if (!btn) return;
    
    if (btn.id === 'btn-add-sidebar-box') {
        openSubjectBoxForm();
        return;
    }

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const target = btn.dataset.target;
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    
    if (target === 'box') {
        document.getElementById('view-box').classList.add('active');
        document.getElementById('page-title').innerText = btn.innerText;
        renderSubjectBox(btn.dataset.boxId);
    } else {
        const viewEl = document.getElementById('view-' + target);
        if (viewEl) viewEl.classList.add('active');
        document.getElementById('page-title').innerText = btn.innerText;
        refreshView(target);
    }
});

async function refreshSidebarBoxes() {
    const boxes = await store.getSubjectBoxes();
    const container = document.getElementById('dynamic-boxes');
    
    const activeBtn = document.querySelector('.nav-btn.active');
    const activeBoxId = activeBtn?.dataset?.target === 'box' ? activeBtn.dataset.boxId : null;

    container.innerHTML = boxes.map(box => `
        <button class="nav-btn ${box.id === activeBoxId ? 'active' : ''}" data-target="box" data-box-id="${box.id}">${box.name}</button>
    `).join('');
}

async function refreshView(view) {
    if (view === 'dashboard') await renderDashboard();
    if (view === 'clinicas') await renderClinics();
    if (view === 'complementares') await renderActivities('comp');
    if (view === 'extensao') await renderActivities('ext');
}

// ---- Modals Logic ----
const modalOverlay = document.getElementById('modal-overlay');
const modalContainer = document.getElementById('modal-container');

function openModal(htmlContent) {
    modalContainer.innerHTML = htmlContent;
    modalOverlay.classList.remove('hidden');
    const firstInput = modalContainer.querySelector('input, select');
    if(firstInput) firstInput.focus();
}

function closeModal() {
    modalOverlay.classList.add('hidden');
    modalContainer.innerHTML = '';
}

modalOverlay.addEventListener('click', (e) => {
    if(e.target === modalOverlay) closeModal();
});

function createFormButtons() {
    return `
        <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
    `;
}

function getEmphasisOptions(selected = '') {
    return window.PREDEFINED_EMPHASES.map(e => `<option value="${e}" ${selected === e ? 'selected' : ''}>${e}</option>`).join('');
}

function getDayOfWeekOptions(selected = '') {
    const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return days.map(d => `<option value="${d}" ${selected === d ? 'selected' : ''}>${d}</option>`).join('');
}

function formatStatus(s) {
    if(s==='concluida') return 'Concluída';
    if(s==='em_curso') return 'Em Curso';
    return 'Pendente / Não Concluída';
}

function generateLinksHTML(item) {
    let html = '';
    if(item.status === 'em_curso' || item.status === 'concluida') {
        if (item.notebookLink) html += `<a href="${item.notebookLink}" target="_blank" style="color: var(--primary-hover); margin-right: 10px;">📔 Caderno</a>`;
        if (item.cloudLink) html += `<a href="${item.cloudLink}" target="_blank" style="color: var(--success-color);">☁️ Nuvem</a>`;
    }
    return html;
}

// ---- Dashboard ----
async function renderDashboard() {
    const stats = await store.getEmphasisStats();
    const list = document.getElementById('emphasis-list');
    
    list.innerHTML = Object.keys(stats).map(cat => {
        const data = stats[cat];
        const badgeClass = data.status === 'Concluída' ? 'badge-concluida' : 'badge-pendente';
        return `
            <div class="emphasis-item">
                <div class="emphasis-header">
                    <h4>${cat}</h4>
                    <span class="badge ${badgeClass}">${data.status}</span>
                </div>
                <div class="emphasis-stats" style="flex-wrap: wrap;">
                    <span>📚 ${data.subjectsCount}/3 Disciplinas</span>
                    <span>⚖️ ${data.clinicsCount}/1 Clínica</span>
                    <span>🧩 ${data.compHours}h Compl.</span>
                    <span>🚀 ${data.extHours}h Extensão</span>
                </div>
            </div>
        `;
    }).join('');

    const boxes = await store.getSubjectBoxes();
    const subjects = await store.getSubjects();
    let totalSubjTarget = boxes.reduce((acc, b) => acc + Number(b.targetHours), 0);
    let totalSubjCompleted = subjects.filter(s => s.status === 'concluida').reduce((acc, s) => acc + Number(s.hours), 0);
    
    const clinics = await store.getClinics();
    let totalClinicsCompleted = clinics.filter(c => c.status === 'concluida').reduce((acc, c) => acc + Number(c.hours), 0);

    const compBox = await store.getCompBox();
    const extBox = await store.getExtBox();
    const compAct = await store.getActivities('comp');
    const extAct = await store.getActivities('ext');
    
    let totalComp = compAct.reduce((acc, a) => acc + Number(a.hours), 0);
    let totalExt = extAct.reduce((acc, a) => acc + Number(a.hours), 0);

    document.getElementById('general-stats').innerHTML = `
        <div class="subject-item glass-panel">
            <strong>Disciplinas Comuns</strong>
            <p>${totalSubjCompleted}h / ${totalSubjTarget}h</p>
        </div>
        <div class="subject-item glass-panel">
            <strong>Clínicas Jurídicas</strong>
            <p>${totalClinicsCompleted}h / 240h</p>
        </div>
        <div class="subject-item glass-panel">
            <strong>Ativ. Complementares</strong>
            <p>${totalComp}h / ${compBox.targetHours}h</p>
        </div>
        <div class="subject-item glass-panel">
            <strong>Ativ. Extensionistas</strong>
            <p>${totalExt}h / ${extBox.targetHours}h</p>
        </div>
    `;
}

// ---- Subject Boxes ----
window.openSubjectBoxForm = async (id = null) => {
    let box = { name: '', targetHours: '' };
    if (id) {
        const boxes = await store.getSubjectBoxes();
        box = boxes.find(b => b.id === id) || box;
    }

    const html = `
        <h3>${id ? 'Editar Caixa' : 'Nova Caixa de Disciplinas'}</h3>
        <form id="form-subject-box">
            <div class="form-group"><label>Nome da Caixa</label><input type="text" id="box-name" class="form-control" value="${box.name}" required></div>
            <div class="form-group"><label>Carga Horária Total (Horas)</label><input type="number" id="box-hours" class="form-control" value="${box.targetHours}" required></div>
            ${createFormButtons()}
        </form>
    `;
    openModal(html);
    
    document.getElementById('form-subject-box').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById('box-name').value,
            targetHours: Number(document.getElementById('box-hours').value)
        };
        if (id) {
            await store.updateSubjectBox(id, data);
            await refreshSidebarBoxes();
            renderSubjectBox(id);
            document.getElementById('page-title').innerText = data.name;
        } else {
            await store.addSubjectBox(data);
            await refreshSidebarBoxes();
        }
        closeModal();
    });
};

window.deleteSubjectBox = async (id) => {
    if(confirm('Tem certeza? Isso apagará TODAS as disciplinas dentro desta caixa também!')) {
        await store.deleteSubjectBox(id);
        await refreshSidebarBoxes();
        document.querySelector('[data-target="dashboard"]').click();
    }
};

async function renderSubjectBox(boxId) {
    const boxes = await store.getSubjectBoxes();
    const box = boxes.find(b => b.id === boxId);
    const container = document.getElementById('single-box-container');
    
    if (!box) {
        container.innerHTML = '';
        return;
    }
    
    const subjects = await store.getSubjects(boxId);
    const completedHours = subjects.filter(s => s.status === 'concluida').reduce((acc, curr) => acc + Number(curr.hours), 0);
    const percent = Math.min((completedHours / box.targetHours) * 100, 100) || 0;

    container.innerHTML = `
        <div class="box-item glass-panel">
            <div class="box-header">
                <div>
                    <h4>${box.name}</h4>
                    <p style="font-size: 13px; color: var(--text-muted)">${completedHours}h / ${box.targetHours}h</p>
                </div>
                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                    <button class="btn btn-secondary btn-sm" onclick="openSubjectBoxForm('${box.id}')">✏️ Editar</button>
                    <button class="btn btn-secondary btn-sm" style="color: var(--danger-color); border-color: var(--danger-color);" onclick="deleteSubjectBox('${box.id}')">🗑️ Excluir</button>
                    <button class="btn btn-primary btn-sm" onclick="openSubjectForm('${box.id}')">+ Disciplina</button>
                </div>
            </div>
            <div class="progress-bar-container"><div class="progress-bar" style="width: ${percent}%"></div></div>
            <div class="subjects-list">
                ${subjects.map(s => `
                    <div class="subject-item status-${s.status}">
                        <div class="item-header">
                            <strong>${s.name}</strong>
                            <div>
                                <span style="font-size: 12px; margin-right: 10px;">${s.hours}h - ${formatStatus(s.status)}</span>
                                <button class="btn btn-secondary btn-sm" onclick="openSubjectForm('${box.id}', '${s.id}')">✏️</button>
                                <button class="btn btn-secondary btn-sm" style="color: var(--danger-color); border-color: var(--danger-color);" onclick="deleteSubject('${s.id}')">🗑️</button>
                            </div>
                        </div>
                        <div class="item-details">
                            <span>Semestre Ideal: ${s.idealSemester}</span>
                            ${s.status === 'concluida' ? `<span>Sem. Conclusão: ${s.completionSemester}</span>` : ''}
                            ${s.status === 'em_curso' ? `<span>Prof: ${s.professor || 'N/A'}</span> <span>Horário: ${s.dayOfWeek} ${s.time}</span> <span>Sala: ${s.room}</span>` : ''}
                            ${s.emphasis === 'sim' ? `<span style="color: var(--success-color)">Ênfase: ${s.emphasisCategory}</span>` : ''}
                            <div style="width: 100%; margin-top: 5px;">${generateLinksHTML(s)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

window.deleteSubject = async (id) => {
    if(confirm('Excluir esta disciplina?')) {
        await store.deleteSubject(id);
        const activeBoxId = document.querySelector('.nav-btn.active')?.dataset.boxId;
        if (activeBoxId) renderSubjectBox(activeBoxId);
    }
};

window.openSubjectForm = async (boxId, id = null) => {
    let subj = { name: '', hours: '', idealSemester: '', status: 'nao_concluida', completionSemester: '', dayOfWeek: '', time: '', room: '', professor: '', cloudLink: '', notebookLink: '', emphasis: 'nao', emphasisCategory: '' };
    if (id) {
        const subjects = await store.getSubjects(boxId);
        subj = subjects.find(s => s.id === id) || subj;
    }

    const html = `
        <h3>${id ? 'Editar Disciplina' : 'Adicionar Disciplina'}</h3>
        <form id="form-subject">
            <div class="form-group"><label>Nome</label><input type="text" id="subj-name" class="form-control" value="${subj.name}" required></div>
            <div class="form-group"><label>Carga Horária</label><input type="number" id="subj-hours" class="form-control" value="${subj.hours}" required></div>
            <div class="form-group"><label>Semestre Ideal</label><input type="number" id="subj-ideal" class="form-control" value="${subj.idealSemester}" required></div>
            <div class="form-group">
                <label>Status</label>
                <select id="subj-status" class="form-control">
                    <option value="nao_concluida" ${subj.status === 'nao_concluida' ? 'selected' : ''}>Não Concluída</option>
                    <option value="em_curso" ${subj.status === 'em_curso' ? 'selected' : ''}>Em Curso</option>
                    <option value="concluida" ${subj.status === 'concluida' ? 'selected' : ''}>Concluída</option>
                </select>
            </div>
            
            <div id="fields-links" style="display: ${subj.status !== 'nao_concluida' ? 'flex' : 'none'}; flex-direction: column; gap: 15px; margin-bottom: 15px;">
                <div class="form-group" style="margin-bottom:0;"><label>Link do Caderno</label><input type="url" id="subj-caderno" class="form-control" value="${subj.notebookLink || ''}"></div>
                <div class="form-group" style="margin-bottom:0;"><label>Link da Nuvem</label><input type="url" id="subj-link" class="form-control" value="${subj.cloudLink || ''}"></div>
            </div>

            <div id="fields-concluida" class="form-group ${subj.status === 'concluida' ? '' : 'hidden'}"><label>Semestre de Conclusão</label><input type="number" id="subj-conclusion" class="form-control" value="${subj.completionSemester || ''}"></div>

            <div id="fields-curso" style="display: ${subj.status === 'em_curso' ? 'flex' : 'none'}; flex-direction: column; gap: 15px; margin-bottom: 15px;">
                <div class="form-group" style="margin-bottom:0;">
                    <label>Dia da Semana</label>
                    <select id="subj-day" class="form-control">
                        <option value="">Selecione...</option>
                        ${getDayOfWeekOptions(subj.dayOfWeek)}
                    </select>
                </div>
                <div class="form-group" style="margin-bottom:0;"><label>Horário</label><input type="time" id="subj-time" class="form-control" value="${subj.time || ''}"></div>
                <div class="form-group" style="margin-bottom:0;"><label>Sala</label><input type="text" id="subj-room" class="form-control" value="${subj.room || ''}"></div>
                <div class="form-group" style="margin-bottom:0;"><label>Professor</label><input type="text" id="subj-prof" class="form-control" value="${subj.professor || ''}"></div>
            </div>

            <div class="form-group">
                <label>Pertence a alguma ênfase?</label>
                <select id="subj-emphasis" class="form-control">
                    <option value="nao" ${subj.emphasis === 'nao' ? 'selected' : ''}>Não</option>
                    <option value="sim" ${subj.emphasis === 'sim' ? 'selected' : ''}>Sim</option>
                </select>
            </div>
            <div id="fields-emphasis" class="form-group ${subj.emphasis === 'sim' ? '' : 'hidden'}">
                <label>Categoria da Ênfase</label>
                <select id="subj-emp-category" class="form-control">
                    ${getEmphasisOptions(subj.emphasisCategory)}
                </select>
            </div>
            ${createFormButtons()}
        </form>
    `;
    openModal(html);

    const toggleFields = (status) => {
        document.getElementById('fields-concluida').classList.add('hidden');
        document.getElementById('fields-curso').style.display = 'none';
        document.getElementById('fields-links').style.display = 'none';
        
        if(status === 'concluida') {
            document.getElementById('fields-concluida').classList.remove('hidden');
            document.getElementById('fields-links').style.display = 'flex';
        }
        if(status === 'em_curso') {
            document.getElementById('fields-curso').style.display = 'flex';
            document.getElementById('fields-links').style.display = 'flex';
        }
    };

    document.getElementById('subj-status').addEventListener('change', (e) => toggleFields(e.target.value));
    
    document.getElementById('subj-emphasis').addEventListener('change', (e) => {
        if(e.target.value === 'sim') document.getElementById('fields-emphasis').classList.remove('hidden');
        else document.getElementById('fields-emphasis').classList.add('hidden');
    });

    document.getElementById('form-subject').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            boxId,
            name: document.getElementById('subj-name').value,
            hours: document.getElementById('subj-hours').value,
            idealSemester: document.getElementById('subj-ideal').value,
            status: document.getElementById('subj-status').value,
            completionSemester: document.getElementById('subj-conclusion').value,
            dayOfWeek: document.getElementById('subj-day').value,
            time: document.getElementById('subj-time').value,
            room: document.getElementById('subj-room').value,
            professor: document.getElementById('subj-prof').value,
            cloudLink: document.getElementById('subj-link').value,
            notebookLink: document.getElementById('subj-caderno').value,
            emphasis: document.getElementById('subj-emphasis').value,
            emphasisCategory: document.getElementById('subj-emp-category').value
        };
        if(id) await store.updateSubject(id, data);
        else await store.addSubject(data);
        closeModal();
        renderSubjectBox(boxId);
    });
};

// ---- Clinics ----
async function renderClinics() {
    const clinics = await store.getClinics();
    const targetHours = 240;
    const completedHours = clinics.filter(c => c.status === 'concluida').reduce((acc, curr) => acc + Number(curr.hours), 0);
    const percent = Math.min((completedHours / targetHours) * 100, 100) || 0;

    const container = document.getElementById('clinics-container');
    container.innerHTML = `
        <div class="box-info glass-panel" style="margin-bottom: 20px;">
            <div class="box-header">
                <div>
                    <h4>Clínicas de Prática Jurídica</h4>
                    <p style="font-size: 13px; color: var(--text-muted)">${completedHours}h concluídas / ${targetHours}h necessárias</p>
                </div>
            </div>
            <div class="progress-bar-container"><div class="progress-bar" style="width: ${percent}%"></div></div>
        </div>
        
        <div class="activities-container">
            ${clinics.map(c => `
                <div class="subject-item status-${c.status}">
                    <div class="item-header">
                        <strong>${c.name}</strong>
                        <div>
                            <span style="font-size: 12px; margin-right: 10px;">${c.hours}h - ${formatStatus(c.status)}</span>
                            <button class="btn btn-secondary btn-sm" onclick="openClinicForm('${c.id}')">✏️ Editar</button>
                            <button class="btn btn-secondary btn-sm" style="color: var(--danger-color); border-color: var(--danger-color);" onclick="deleteClinic('${c.id}')">🗑️</button>
                        </div>
                    </div>
                    <div class="item-details">
                        ${c.emphasis === 'sim' ? `<span style="color: var(--primary-hover)">Ênfase: ${c.emphasisCategory}</span>` : '<span>Sem Ênfase Específica</span>'}
                        ${c.status === 'concluida' ? `<span style="color: var(--success-color)">Sem. Conclusão: ${c.completionSemester}</span> <span style="color: var(--success-color)">Prof: ${c.professor || 'N/A'}</span>` : ''}
                        ${c.status === 'em_curso' ? `
                            <span style="color: var(--success-color)">Prof: ${c.professor || 'N/A'}</span>
                            <span style="color: var(--success-color)">Horário: ${c.dayOfWeek || ''} ${c.time || ''}</span>
                        ` : ''}
                        <div style="width: 100%; margin-top: 5px;">${generateLinksHTML(c)}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

document.getElementById('btn-add-clinic').addEventListener('click', () => openClinicForm());

window.deleteClinic = async (id) => {
    if(confirm('Deseja realmente excluir esta clínica?')) {
        await store.deleteClinic(id);
        renderClinics();
    }
};

window.openClinicForm = async (id = null) => {
    let clinic = { name: '', hours: 120, status: 'pendente', completionSemester: '', professor: '', emphasis: 'nao', emphasisCategory: '', notebookLink: '', cloudLink: '', dayOfWeek: '', time: '' };
    if (id) {
        const clinics = await store.getClinics();
        clinic = clinics.find(c => c.id === id) || clinic;
    }

    const html = `
        <h3>${id ? 'Editar Clínica' : 'Nova Clínica'}</h3>
        <form id="form-clinic">
            <div class="form-group"><label>Nome da Clínica</label><input type="text" id="clinic-name" class="form-control" value="${clinic.name}" required></div>
            <div class="form-group"><label>Carga Horária</label><input type="number" id="clinic-hours" class="form-control" value="${clinic.hours}" required></div>
            
            <div class="form-group">
                <label>Status</label>
                <select id="clinic-status" class="form-control">
                    <option value="pendente" ${clinic.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                    <option value="em_curso" ${clinic.status === 'em_curso' ? 'selected' : ''}>Em Curso</option>
                    <option value="concluida" ${clinic.status === 'concluida' ? 'selected' : ''}>Concluída</option>
                </select>
            </div>
            
            <div id="clinic-fields-links" style="display: ${clinic.status !== 'pendente' ? 'flex' : 'none'}; flex-direction: column; gap: 15px; margin-bottom: 15px;">
                <div class="form-group" style="margin-bottom:0;"><label>Link do Caderno</label><input type="url" id="clinic-caderno" class="form-control" value="${clinic.notebookLink || ''}"></div>
                <div class="form-group" style="margin-bottom:0;"><label>Link da Nuvem</label><input type="url" id="clinic-cloud" class="form-control" value="${clinic.cloudLink || ''}"></div>
            </div>

            <div id="clinic-fields-prof" class="form-group ${clinic.status !== 'pendente' ? '' : 'hidden'}">
                <label>Professor</label>
                <input type="text" id="clinic-prof" class="form-control" value="${clinic.professor || ''}">
            </div>

            <div id="clinic-fields-concluida" class="form-group ${clinic.status === 'concluida' ? '' : 'hidden'}">
                <label>Semestre de Conclusão</label>
                <input type="number" id="clinic-conclusion" class="form-control" value="${clinic.completionSemester || ''}">
            </div>

            <div id="clinic-fields-curso" style="display: ${clinic.status === 'em_curso' ? 'flex' : 'none'}; flex-direction: column; gap: 15px; margin-bottom: 15px;">
                <div class="form-group" style="margin-bottom:0;">
                    <label>Dia da Semana</label>
                    <select id="clinic-day" class="form-control">
                        <option value="">Selecione...</option>
                        ${getDayOfWeekOptions(clinic.dayOfWeek)}
                    </select>
                </div>
                <div class="form-group" style="margin-bottom:0;"><label>Horário</label><input type="time" id="clinic-time" class="form-control" value="${clinic.time || ''}"></div>
            </div>

            <div class="form-group">
                <label>Pertence a alguma ênfase?</label>
                <select id="clinic-emphasis" class="form-control">
                    <option value="nao" ${clinic.emphasis === 'nao' ? 'selected' : ''}>Não</option>
                    <option value="sim" ${clinic.emphasis === 'sim' ? 'selected' : ''}>Sim</option>
                </select>
            </div>
            <div id="clinic-fields-emphasis" class="form-group ${clinic.emphasis === 'sim' ? '' : 'hidden'}">
                <label>Categoria da Ênfase</label>
                <select id="clinic-emp-category" class="form-control">
                    ${getEmphasisOptions(clinic.emphasisCategory)}
                </select>
            </div>

            ${createFormButtons()}
        </form>
    `;
    openModal(html);

    const toggleClinicFields = (status) => {
        document.getElementById('clinic-fields-concluida').classList.add('hidden');
        document.getElementById('clinic-fields-curso').style.display = 'none';
        document.getElementById('clinic-fields-links').style.display = 'none';
        document.getElementById('clinic-fields-prof').classList.add('hidden');
        
        if(status === 'concluida' || status === 'em_curso') {
            document.getElementById('clinic-fields-prof').classList.remove('hidden');
            document.getElementById('clinic-fields-links').style.display = 'flex';
        }
        if(status === 'concluida') {
            document.getElementById('clinic-fields-concluida').classList.remove('hidden');
        }
        if(status === 'em_curso') {
            document.getElementById('clinic-fields-curso').style.display = 'flex';
        }
    };

    document.getElementById('clinic-status').addEventListener('change', (e) => toggleClinicFields(e.target.value));

    document.getElementById('clinic-emphasis').addEventListener('change', (e) => {
        if(e.target.value === 'sim') document.getElementById('clinic-fields-emphasis').classList.remove('hidden');
        else document.getElementById('clinic-fields-emphasis').classList.add('hidden');
    });

    document.getElementById('form-clinic').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById('clinic-name').value,
            hours: document.getElementById('clinic-hours').value,
            status: document.getElementById('clinic-status').value,
            completionSemester: document.getElementById('clinic-conclusion').value,
            professor: document.getElementById('clinic-prof').value,
            dayOfWeek: document.getElementById('clinic-day').value,
            time: document.getElementById('clinic-time').value,
            notebookLink: document.getElementById('clinic-caderno').value,
            cloudLink: document.getElementById('clinic-cloud').value,
            emphasis: document.getElementById('clinic-emphasis').value,
            emphasisCategory: document.getElementById('clinic-emp-category').value
        };
        if(id) await store.updateClinic(id, data);
        else await store.addClinic(data);
        closeModal();
        renderClinics();
    });
}

// ---- Activities (Comp / Ext) ----
async function renderActivities(type) {
    const box = type === 'comp' ? await store.getCompBox() : await store.getExtBox();
    const activities = await store.getActivities(type);
    const completedHours = activities.reduce((acc, curr) => acc + Number(curr.hours), 0);
    const percent = Math.min((completedHours / (box.targetHours || 1)) * 100, 100) || 0;

    const infoContainer = document.getElementById(type === 'comp' ? 'comp-box-info' : 'ext-box-info');
    infoContainer.innerHTML = `
        <div class="box-header">
            <div>
                <h4>Total de Horas Necessárias: ${box.targetHours}h</h4>
                <p style="font-size: 13px; color: var(--text-muted)">Horas cumpridas: ${completedHours}h</p>
            </div>
        </div>
        <div class="progress-bar-container"><div class="progress-bar" style="width: ${percent}%"></div></div>
    `;

    const actContainer = document.getElementById(type === 'comp' ? 'comp-activities-container' : 'ext-activities-container');
    actContainer.innerHTML = activities.map(a => `
        <div class="activity-item glass-panel">
            <div class="item-header">
                <strong>${a.name}</strong>
                <div>
                    <span style="font-size: 12px; margin-right: 10px;">${a.hours}h</span>
                    <button class="btn btn-secondary btn-sm" onclick="openActivityForm('${type}', '${a.id}')">✏️ Editar</button>
                    <button class="btn btn-secondary btn-sm" style="color: var(--danger-color); border-color: var(--danger-color);" onclick="deleteActivity('${type}', '${a.id}')">🗑️</button>
                </div>
            </div>
            <div class="item-details">
                <span>Categoria: ${a.category}</span>
                <span>Data: ${a.dateType === 'single' ? a.date : `${a.startDate} até ${a.endDate}`}</span>
                ${a.emphasis === 'sim' ? `<span style="color: var(--success-color)">Ênfase: ${a.emphasisCategory}</span>` : ''}
            </div>
        </div>
    `).join('');
}

window.deleteActivity = async (type, id) => {
    if(confirm('Excluir esta atividade?')) {
        await store.deleteActivity(type, id);
        renderActivities(type);
    }
};

window.openBoxConfig = (type) => {
    const title = type === 'comp' ? 'Ativ. Complementares' : 'Ativ. Extensionistas';
    const html = `
        <h3>Configurar Horas Totais - ${title}</h3>
        <form id="form-config-box">
            <div class="form-group"><label>Horas Totais</label><input type="number" id="box-total-hours" class="form-control" required></div>
            ${createFormButtons()}
        </form>
    `;
    openModal(html);
    document.getElementById('form-config-box').addEventListener('submit', async (e) => {
        e.preventDefault();
        const hrs = document.getElementById('box-total-hours').value;
        if(type === 'comp') await store.updateCompBox(hrs);
        if(type === 'ext') await store.updateExtBox(hrs);
        closeModal();
        renderActivities(type);
    });
};
document.getElementById('btn-config-comp-box').addEventListener('click', () => window.openBoxConfig('comp'));
document.getElementById('btn-config-ext-box').addEventListener('click', () => window.openBoxConfig('ext'));

window.openActivityForm = async (type, id = null) => {
    let act = { name: '', hours: '', category: '', dateType: 'single', date: '', startDate: '', endDate: '', emphasis: 'nao', emphasisCategory: '' };
    if (id) {
        const acts = await store.getActivities(type);
        act = acts.find(a => a.id === id) || act;
    }

    const html = `
        <h3>${id ? 'Editar Atividade' : 'Nova Atividade'}</h3>
        <form id="form-activity">
            <div class="form-group"><label>Nome</label><input type="text" id="act-name" class="form-control" value="${act.name}" required></div>
            <div class="form-group"><label>Carga Horária</label><input type="number" id="act-hours" class="form-control" value="${act.hours}" required></div>
            <div class="form-group"><label>Categoria</label><input type="text" id="act-category" class="form-control" value="${act.category}" required></div>
            <div class="form-group">
                <label>Formato da Data</label>
                <select id="act-datetype" class="form-control">
                    <option value="single" ${act.dateType === 'single' ? 'selected' : ''}>Data Única</option>
                    <option value="range" ${act.dateType === 'range' ? 'selected' : ''}>Período (Início/Fim)</option>
                </select>
            </div>
            <div id="fields-date-single" class="form-group" style="display: ${act.dateType === 'single' ? 'flex' : 'none'};"><label>Data</label><input type="date" id="act-date" class="form-control" value="${act.date}"></div>
            <div id="fields-date-range" style="display: ${act.dateType === 'range' ? 'flex' : 'none'}; flex-direction: column; gap: 15px; margin-bottom: 15px;">
                <div class="form-group" style="margin-bottom:0;"><label>Data Início</label><input type="date" id="act-start" class="form-control" value="${act.startDate}"></div>
                <div class="form-group" style="margin-bottom:0;"><label>Data Fim</label><input type="date" id="act-end" class="form-control" value="${act.endDate}"></div>
            </div>

            <div class="form-group">
                <label>Pertence a alguma ênfase?</label>
                <select id="act-emphasis" class="form-control">
                    <option value="nao" ${act.emphasis === 'nao' ? 'selected' : ''}>Não</option>
                    <option value="sim" ${act.emphasis === 'sim' ? 'selected' : ''}>Sim</option>
                </select>
            </div>
            <div id="fields-act-emphasis" class="form-group ${act.emphasis === 'sim' ? '' : 'hidden'}">
                <label>Categoria da Ênfase</label>
                <select id="act-emp-category" class="form-control">
                    ${getEmphasisOptions(act.emphasisCategory)}
                </select>
            </div>
            ${createFormButtons()}
        </form>
    `;
    openModal(html);

    document.getElementById('act-datetype').addEventListener('change', (e) => {
        if(e.target.value === 'single') {
            document.getElementById('fields-date-single').style.display = 'flex';
            document.getElementById('fields-date-range').style.display = 'none';
        } else {
            document.getElementById('fields-date-single').style.display = 'none';
            document.getElementById('fields-date-range').style.display = 'flex';
        }
    });

    document.getElementById('act-emphasis').addEventListener('change', (e) => {
        if(e.target.value === 'sim') document.getElementById('fields-act-emphasis').classList.remove('hidden');
        else document.getElementById('fields-act-emphasis').classList.add('hidden');
    });

    document.getElementById('form-activity').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById('act-name').value,
            hours: document.getElementById('act-hours').value,
            category: document.getElementById('act-category').value,
            dateType: document.getElementById('act-datetype').value,
            date: document.getElementById('act-date').value,
            startDate: document.getElementById('act-start').value,
            endDate: document.getElementById('act-end').value,
            emphasis: document.getElementById('act-emphasis').value,
            emphasisCategory: document.getElementById('act-emp-category').value
        };
        if(id) await store.updateActivity(type, id, data);
        else await store.addActivity(type, data);
        closeModal();
        renderActivities(type);
    });
};

document.getElementById('btn-add-comp-activity').addEventListener('click', () => openActivityForm('comp'));
document.getElementById('btn-add-ext-activity').addEventListener('click', () => openActivityForm('ext'));

// Init
window.addEventListener('DOMContentLoaded', async () => {
    try {
        if (!window.supabase) throw new Error("Supabase SDK failed to load from CDN.");
        await store.init();
        await refreshSidebarBoxes();
        renderDashboard();
    } catch (err) {
        document.body.innerHTML = `<div style="padding: 20px; color: white; background: red; height: 100vh;">
            <h2>App Initialization Error</h2>
            <pre>${err.message}</pre>
            <pre>${err.stack}</pre>
        </div>`;
    }
});