#!/usr/bin/env node
// Offline delivery-document checks, not a source probe or a secret scanner.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const assets = fileURLToPath(new URL('../assets/', import.meta.url));
const states = ['pass', 'fail', 'not_run'];
const acceptanceChecks = {
  guidedSetup: '网站首次设置向导', sourceMatching: '按领域自动匹配来源', secretStorage: '本机凭据录入与保护',
  backgroundSchedule: '真实后台到期触发与网站调度控制', browserClosed: '关闭浏览器后仍更新', restartCatchup: '重启与漏跑恢复',
  automaticPublishing: '自动发布和页面获取新日报', modelSummaries: '模型摘要与证据', dedupAndUpdates: '事件去重与增量更新',
  freshnessAndHeat: '最新与热度依据', originalLinks: '原文跳转'
};
const scheduledChecks = new Set(['backgroundSchedule', 'browserClosed', 'restartCatchup', 'automaticPublishing']);
const nonempty = (v) => typeof v === 'string' && v.trim().length > 0;
const amount = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const list = (v) => Array.isArray(v) && v.every(nonempty);
const placeholder = (v) => !nonempty(v) || /待填写|示例|example\.(org|com)|^unknown$/i.test(v);

function timestamp(value) {
  if (typeof value !== 'string') return NaN;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value);
  if (!m) return NaN;
  const year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return NaN;
  return Date.parse(value);
}

export function initKit(target) {
  const destination = path.resolve(target);
  // mkdir is exclusive: an existing directory (even empty) is never overwritten.
  fs.mkdirSync(destination);
  for (const name of ['client-profile.json', 'source-manifest.json', 'automation-acceptance.json', 'scheduled-run-evidence.example.json', '.env.example', 'handoff-template.md']) {
    fs.copyFileSync(path.join(assets, name), path.join(destination, name), fs.constants.COPYFILE_EXCL);
  }
  return destination;
}

function readJson(file) {
  if (fs.statSync(file).size > 1024 * 1024) throw new Error('Configuration exceeds 1 MB');
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function safeUrl(value, allowLocal = false) {
  try {
    const url = new URL(value);
    if (url.username || url.password) return false;
    if ([...url.searchParams.keys()].some((k) => /key|token|secret|password|signature/i.test(k))) return false;
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    return (url.protocol === 'https:' && (allowLocal || !local)) || (allowLocal && local && url.protocol === 'http:');
  } catch { return false; }
}

function evidenceExists(root, relative) {
  if (!nonempty(relative) || path.isAbsolute(relative) || path.win32.isAbsolute(relative)) return false;
  const pieces = relative.replaceAll('\\', '/').split('/');
  if (pieces.some((s) => s === '..' || s.includes(':'))) return false;
  try {
    const resolved = fs.realpathSync(path.join(root, ...pieces));
    const rel = path.relative(root, resolved);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return false;
    return fs.statSync(resolved).isFile() && fs.statSync(resolved).size > 0;
  } catch { return false; }
}

function hasInlineSecret(value) {
  if (Array.isArray(value)) return value.some(hasInlineSecret);
  if (object(value)) return Object.entries(value).some(([k, v]) =>
    (/^(api[_-]?key|access[_-]?token|token|secret|password|authorization|cookie)$/i.test(k) && v !== null && v !== '') || hasInlineSecret(v));
  return typeof value === 'string' && /\bsk-[a-zA-Z0-9_-]{20,}/.test(value);
}

function scheduledTraceValid(root, relative) {
  if (!evidenceExists(root, relative)) return false;
  try {
    const trace = readJson(path.join(root, ...relative.replaceAll('\\', '/').split('/')));
    const { scheduler: s, refreshRun: r, publication: p, browser: b } = trace;
    if (trace.version !== 1 || trace.kind !== 'scheduled-run' || ![s, r, p, b].every(object)) return false;
    if (s.trigger !== 'scheduled' || r.trigger !== 'scheduled' || !nonempty(r.id) || s.runId !== r.id || p.runId !== r.id) return false;
    if (s.scheduledFor !== r.scheduledFor || !['succeeded', 'partial', 'no_results'].includes(r.status)) return false;
    if (!nonempty(p.editionId) || b.observedEditionId !== p.editionId) return false;
    const [due, started, ended, published, closed, reopened] = [s.scheduledFor, r.startedAt, r.completedAt, p.publishedAt, b.closedAt, b.reopenedAt].map(timestamp);
    return [due, started, ended, published, closed, reopened].every(Number.isFinite) && due <= started && started <= ended &&
      started <= published && published <= ended && closed <= started && reopened >= ended;
  } catch { return false; }
}

export function validateKit(target, { ready = false, now = Date.now() } = {}) {
  const errors = [], pending = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const gate = (condition, message) => { if (!condition) (ready ? errors : pending).push(message); };
  let root, profile, manifest, acceptance;
  try {
    root = fs.realpathSync(path.resolve(target));
    profile = readJson(path.join(root, 'client-profile.json'));
    manifest = readJson(path.join(root, 'source-manifest.json'));
    acceptance = readJson(path.join(root, 'automation-acceptance.json'));
  } catch { return { ok: false, status: 'invalid', deploymentVerified: false, mode: ready ? 'ready' : 'draft', errors: ['配置缺失、不可读、过大或 JSON 损坏'], pending }; }
  if (!object(profile) || !object(manifest) || !object(acceptance)) return { ok: false, status: 'invalid', deploymentVerified: false, errors: ['配置与验收清单顶层必须为对象'], pending };
  check(!hasInlineSecret(profile) && !hasInlineSecret(manifest) && !hasInlineSecret(acceptance), '配置疑似含内联秘密；仅保存环境变量名，清理后重试');
  check(profile.version === 1 && manifest.version === 1, '配置 version 必须为 1');
  check(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(profile.clientSlug ?? ''), 'clientSlug 必须为小写英文、数字与连字符');
  gate(!placeholder(profile.objective), '客户决策目的尚未填写');
  const topics = Array.isArray(profile.topics) ? profile.topics : [];
  check(topics.length > 0 && topics.every(object), '至少需要一个有效主题对象');
  const ids = new Set();
  for (const topic of topics.filter(object)) {
    check(nonempty(topic.id) && !ids.has(topic.id), '主题 ID 必须非空且唯一'); ids.add(topic.id);
    gate(!placeholder(topic.name) && !placeholder(topic.purpose), '主题名称或目的尚未填写');
    for (const field of ['include', 'exclude', 'entities', 'regions', 'languages']) check(list(topic[field]), `主题 ${field} 必须为字符串数组`);
    check(topic.languages?.length > 0, '主题至少需要一种语言');
    check(Number.isInteger(topic.maxItems) && topic.maxItems > 0 && topic.maxItems <= 100, '主题 maxItems 必须为 1–100 整数');
  }
  const delivery = object(profile.delivery) ? profile.delivery : {};
  check(['windows', 'macos', 'linux', 'unknown'].includes(delivery.os), 'delivery.os 无效');
  gate(delivery.os !== 'unknown', '客户系统尚未确认');
  try { if (!nonempty(delivery.timeZone)) throw new Error(); new Intl.DateTimeFormat('en', { timeZone: delivery.timeZone }); }
  catch { errors.push('客户时区不是可用的 IANA 时区'); }
  check(/^([01]\d|2[0-3]):[0-5]\d$/.test(delivery.dailyAt ?? ''), '每日时间必须为 HH:mm');
  check(Number.isInteger(delivery.readingBudgetMinutes) && delivery.readingBudgetMinutes > 0, '阅读预算必须为正整数分钟');
  const budgets = object(profile.budgets) ? profile.budgets : {};
  check(/^[A-Z]{3}$/.test(budgets.currency ?? ''), '预算 currency 必须为三位大写币种');
  check(amount(budgets.modelMonthlyLimit) && amount(budgets.sourceMonthlyLimit), '模型和信息源月预算分别为非负数');
  const model = object(profile.model) ? profile.model : {};
  const intelligence = object(profile.intelligence) ? profile.intelligence : {};
  check(['model', 'raw'].includes(intelligence.mode) && states.includes(intelligence.rawFlowTest), 'intelligence 必须明确 model/raw 模式与 rawFlowTest 状态');
  check(nonempty(model.provider) && states.includes(model.configurationTest), '模型配置或自检状态无效');
  if (model.baseUrl !== null) check(safeUrl(model.baseUrl, true), '模型 URL 必须为无内嵌秘密的 HTTPS，或明确的本机 HTTP');
  check(model.apiKeyEnv === null || /^[A-Z][A-Z0-9_]*$/.test(model.apiKeyEnv ?? ''), '模型仅记录合法的鉴权环境变量名或 null');
  if (intelligence.mode === 'model') {
    gate(model.provider !== 'unconfigured' && nonempty(model.modelId), '模型尚未选择或配置');
    gate(model.configurationTest === 'pass' && evidenceExists(root, model.testEvidence), '缺少模型实际自检及本地证据');
  } else if (intelligence.mode === 'raw') {
    gate(intelligence.rawFlowTest === 'pass' && evidenceExists(root, intelligence.testEvidence), '缺少纯原始资讯的界面标注与无模型更新实测证据');
  }
  const automation = object(profile.automation) ? profile.automation : {};
  check(['manual', 'scheduled'].includes(automation.requestedMode) && ['manual', 'scheduled'].includes(automation.mode) && states.includes(automation.tested), '自动更新目标、当前模式或测试状态无效');
  gate(automation.mode === automation.requestedMode, '当前更新模式尚未达到客户要求');
  if (automation.requestedMode === 'scheduled' || automation.mode === 'scheduled') gate(automation.tested === 'pass' && evidenceExists(root, automation.testEvidence), '缺少调度器触发的实际更新证据');
  if (automation.requestedMode === 'scheduled' || automation.mode === 'scheduled') gate(scheduledTraceValid(root, automation.testEvidence), '自动调度证据须为关联的 scheduled-run JSON：定时触发、运行时间、日报发布与关闭浏览器后重开观察；手动刷新或普通文本不接受');
  check(acceptance.version === 1 && object(acceptance.checks), '自动化验收清单版本或 checks 无效');
  for (const [id, label] of Object.entries(acceptanceChecks)) {
    const entry = object(acceptance.checks) ? acceptance.checks[id] : undefined;
    check(object(entry) && states.includes(entry.status), `自动化验收项 ${id} 缺失或状态无效`);
    if (scheduledChecks.has(id) && automation.requestedMode === 'manual' && automation.mode === 'manual') continue;
    if (id === 'modelSummaries' && intelligence.mode === 'raw') continue;
    gate(entry?.status === 'pass' && evidenceExists(root, entry?.evidence), `缺少${label}的验收证据`);
  }
  check(object(profile.privacy) && typeof profile.privacy.commercialUse === 'boolean' && typeof profile.privacy.storeFullText === 'boolean', 'privacy 必须明确商业用途与全文保存开关');
  const sources = Array.isArray(manifest.sources) ? manifest.sources : [];
  check(Array.isArray(manifest.sources) && sources.every(object), 'sources 必须为来源对象数组');
  const sourceIds = new Set(), covered = new Set();
  let estimatedCost = 0, enabled = 0;
  for (const source of sources.filter(object)) {
    check(nonempty(source.id) && !sourceIds.has(source.id), '来源 ID 必须非空且唯一'); sourceIds.add(source.id);
    check(typeof source.enabled === 'boolean', '来源 enabled 必须为布尔值');
    check(['api', 'rss', 'html', 'manual'].includes(source.kind), '来源 kind 无效');
    check(list(source.topicIds) && source.topicIds.every((id) => ids.has(id)), '来源须引用存在的主题 ID');
    check(['free_no_key', 'free_key', 'free_noncommercial', 'paid', 'unknown'].includes(source.accessClass), '来源 accessClass 无效');
    check(['allowed', 'disallowed', 'unknown'].includes(source.commercialUse), '来源 commercialUse 无效');
    check(['metadata', 'excerpt', 'fulltext'].includes(source.contentScope), '来源 contentScope 无效');
    check(source.authEnv === null || /^[A-Z][A-Z0-9_]*$/.test(source.authEnv ?? ''), '来源仅记录鉴权环境变量名或 null');
    check(source.estimatedMonthlyCost === null || amount(source.estimatedMonthlyCost), '来源月费必须为非负数或 null');
    check(object(source.probe) && states.includes(source.probe.status), '来源 probe 状态无效');
    for (const field of ['endpoint', 'docsUrl', 'termsUrl']) check(safeUrl(source[field]), `来源 ${field} 必须为无内嵌秘密的 HTTPS URL`);
    if (!source.enabled) continue;
    enabled++;
    gate(!placeholder(source.name) && !placeholder(source.endpoint), '启用来源仍含示例或空名称');
    gate(source.kind !== 'manual', '人工源不能充当已接通自动来源');
    gate(source.topicIds?.length > 0, '启用来源未绑定主题');
    gate(source.accessClass !== 'unknown', '启用来源免费条件尚未核实');
    if (source.accessClass === 'free_key') gate(nonempty(source.authEnv), '免费鉴权来源缺少客户凭据环境变量引用');
    if (profile.privacy?.commercialUse) gate(source.commercialUse === 'allowed' && source.accessClass !== 'free_noncommercial', '商业客户的来源使用范围尚未获准');
    if (source.contentScope === 'fulltext') gate(profile.privacy?.storeFullText === true, '来源全文范围与客户全文保存开关冲突');
    gate(source.probe?.status === 'pass' && evidenceExists(root, source.probe?.evidence), '启用来源缺少实际探测及本地证据');
    const checked = timestamp(source.checkedAt);
    gate(Number.isFinite(checked) && checked <= now + 300000 && checked >= now - 30 * 86400000, '来源核验时间缺失、异常或超过 30 天');
    gate(amount(source.estimatedMonthlyCost) && source.currency === budgets.currency, '来源费用或币种尚未核实');
    if (amount(source.estimatedMonthlyCost)) estimatedCost += source.estimatedMonthlyCost;
    if (list(source.topicIds)) for (const id of source.topicIds) covered.add(id);
  }
  gate(enabled > 0, '尚无启用的信息源');
  gate([...ids].every((id) => covered.has(id)), '部分主题没有启用来源覆盖');
  gate(estimatedCost <= budgets.sourceMonthlyLimit, '来源预计月费超过客户来源预算');
  const status = errors.length ? 'document_precheck_failed' : ready ? 'document_precheck_ok' : pending.length ? 'draft_with_pending' : 'draft_structure_ok';
  return { ok: errors.length === 0, status, deploymentVerified: false, mode: ready ? 'ready' : 'draft', errors, pending, note: '仅离线资料预检，不证明联网、许可证、费用估算或证据内容真实。' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, flag, target, ...rest] = process.argv.slice(2);
  try {
    if (command === 'init' && flag === '--out' && target && rest.length === 0) {
      initKit(target); process.stdout.write('已生成配置草稿与交接模板；网站和自动任务尚未创建。\n');
    } else if (command === 'validate' && flag === '--dir' && target && (rest.length === 0 || (rest.length === 1 && rest[0] === '--ready'))) {
      const result = validateKit(target, { ready: rest.includes('--ready') });
      process.stdout.write(JSON.stringify(result, null, 2) + '\n'); process.exitCode = result.ok ? 0 : 1;
    } else {
      process.stderr.write('用法: client-kit.mjs init --out NEW_DIR | validate --dir DIR [--ready]\n'); process.exitCode = 2;
    }
  } catch (error) {
    process.stderr.write(error?.code === 'EEXIST' ? '目标目录已存在；拒绝覆盖。\n' : '操作失败；请检查目标路径、父目录和文件权限。\n'); process.exitCode = 1;
  }
}
