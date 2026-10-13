<template>
  <div class="container">
    <h1>📝 我的工作与生活日志</h1>

    <!-- ================= 配置区 ================= -->
    <div v-if="!isConfigured" class="config-box">
      <p class="tips">首次使用，请配置 Gitee 信息</p>
      <input v-model="giteeOwner" placeholder="Gitee 用户名 (个人主页网址后面的字母)" />
      <input v-model="giteeRepo" placeholder="仓库名 (如: lifelog)" />
      <input v-model="giteeToken" placeholder="私人令牌 (Token)" type="password" />
      <button @click="saveConfig" class="primary-btn">保存配置</button>
    </div>

    <!-- ================= 已配置区域 ================= -->
    <div v-else>
      <!-- ---------- 写作视图 ---------- -->
      <div v-if="currentView === 'editor'" class="editor-box">
        <textarea
          v-model="content"
          placeholder="今天发生了什么？有什么感想？..."
        ></textarea>

        <button @click="saveLog" :disabled="isSaving" class="primary-btn">
          {{ isSaving ? '🚀 正在同步到云端...' : '✨ 同步到 Gitee' }}
        </button>

        <button @click="openHistory" class="secondary-btn">
          📋 查看历史记录
        </button>

        <button @click="clearConfig" class="text-btn">修改 Gitee 配置</button>
      </div>

      <!-- ---------- 历史记录视图 ---------- -->
      <div v-else-if="currentView === 'history'" class="history-box">
        <button @click="backToEditor" class="back-btn">← 返回写日记</button>

        <!-- 加载中 -->
        <div v-if="isLoadingHistory" class="loading">⏳ 正在加载历史记录...</div>

        <!-- 详情：查看单篇日记 -->
        <div v-else-if="viewingFile" class="detail-view">
          <button @click="backToList" class="back-btn">← 返回列表</button>
          <h2 class="detail-title">{{ viewingFile.title }}</h2>
          <div v-if="isLoadingContent" class="loading">⏳ 正在加载内容...</div>
          <pre v-else class="detail-content">{{ viewingFile.content }}</pre>
        </div>

        <!-- 历史列表 -->
        <div v-else class="list-view">
          <div v-if="historyFiles.length === 0" class="empty-tips">
            暂无历史记录，快去写第一篇日记吧 ✍️
          </div>
          <div
            v-for="file in historyFiles"
            :key="file.path"
            class="history-item"
            @click="viewFileContent(file)"
          >
            <span class="file-date">{{ formatFileDate(file.path) }}</span>
            <span class="file-arrow">›</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// ==================== 状态变量 ====================
// 配置相关
const isConfigured = ref(false)
const giteeOwner = ref('')
const giteeRepo = ref('')
const giteeToken = ref('')

// 写作相关
const content = ref('')
const isSaving = ref(false)

// 视图切换 & 历史记录相关
const currentView = ref('editor')          // 'editor' | 'history'
const historyFiles = ref([])               // 文件树中筛选出的 .md 文件
const isLoadingHistory = ref(false)        // 加载文件列表
const viewingFile = ref(null)              // { title, content } | null
const isLoadingContent = ref(false)        // 加载单篇内容

// ==================== 初始化 ====================
onMounted(() => {
  if (localStorage.getItem('gitee_token')) {
    giteeOwner.value = localStorage.getItem('gitee_owner') || ''
    giteeRepo.value = localStorage.getItem('gitee_repo') || ''
    giteeToken.value = localStorage.getItem('gitee_token') || ''
    isConfigured.value = true
  }
})

// ==================== 配置相关方法 ====================
function saveConfig() {
  if (!giteeOwner.value || !giteeRepo.value || !giteeToken.value) {
    alert('请填写完整的配置信息哦！')
    return
  }
  localStorage.setItem('gitee_owner', giteeOwner.value)
  localStorage.setItem('gitee_repo', giteeRepo.value)
  localStorage.setItem('gitee_token', giteeToken.value)
  isConfigured.value = true
}

function clearConfig() {
  isConfigured.value = false
}

// ==================== 编码工具 ====================

// 发送时：中文字符串 → Base64
function utf8_to_b64(str) {
  return window.btoa(unescape(encodeURIComponent(str)))
}

// 读取时：Base64 → 中文字符串（使用 TextDecoder 避免 atob 中文乱码）
function decodeBase64(base64Str) {
  // 去掉可能的换行符，atob 对含换行的字符串可能报错
  const cleaned = base64Str.replace(/\s/g, '')
  const binary = window.atob(cleaned)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder('utf-8').decode(bytes)
}

// ==================== 写作：发布日记 ====================
async function saveLog() {
  if (!content.value.trim()) {
    alert('内容不能为空哦！')
    return
  }

  isSaving.value = true

  try {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const HH = String(now.getHours()).padStart(2, '0')
    const MM = String(now.getMinutes()).padStart(2, '0')
    const SS = String(now.getSeconds()).padStart(2, '0')

    const filename = `${yyyy}${mm}${dd}_${HH}${MM}${SS}.md`
    const path = `posts/${yyyy}/${mm}/${filename}`

    const mdContent = `---\ndate: ${now.toLocaleString()}\n---\n\n${content.value}`

    const url = `https://gitee.com/api/v5/repos/${giteeOwner.value}/${giteeRepo.value}/contents/${path}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: giteeToken.value,
        content: utf8_to_b64(mdContent),
        message: `Add log: ${filename}`
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || '网络请求失败')
    }

    alert('🎉 同步成功！你的日记已安全存入 Gitee。')
    content.value = ''

  } catch (error) {
    alert('❌ 同步失败: ' + error.message)
  } finally {
    isSaving.value = false
  }
}

// ==================== 历史记录 ====================

// 切换到历史视图并加载文件列表
async function openHistory() {
  currentView.value = 'history'
  isLoadingHistory.value = true
  historyFiles.value = []
  viewingFile.value = null

  try {
    // 1. 获取仓库默认分支
    const repoUrl = `https://gitee.com/api/v5/repos/${giteeOwner.value}/${giteeRepo.value}?access_token=${giteeToken.value}`
    const repoRes = await fetch(repoUrl)
    if (!repoRes.ok) throw new Error('无法获取仓库信息，请检查 Token 权限')
    const repoData = await repoRes.json()
    const defaultBranch = repoData.default_branch || 'master'

    // 2. 递归拉取整个文件树（一次请求拿到所有文件路径）
    const treeUrl = `https://gitee.com/api/v5/repos/${giteeOwner.value}/${giteeRepo.value}/git/trees/${defaultBranch}?recursive=1&access_token=${giteeToken.value}`
    const treeRes = await fetch(treeUrl)
    if (!treeRes.ok) throw new Error('无法获取文件树')
    const treeData = await treeRes.json()

    // 3. 筛选 posts/ 下的 .md 文件，按路径倒序（最新的排前面）
    if (treeData.tree) {
      historyFiles.value = treeData.tree
        .filter(item => item.path.startsWith('posts/') && item.path.endsWith('.md'))
        .sort((a, b) => b.path.localeCompare(a.path))
    }
  } catch (error) {
    alert('❌ 加载历史记录失败: ' + error.message)
  } finally {
    isLoadingHistory.value = false
  }
}

// 把文件路径解析成可读的日期时间
function formatFileDate(path) {
  // path 示例: posts/2026/07/20260707_233015.md
  const filename = path.split('/').pop()           // "20260707_233015.md"
  const name = filename.replace('.md', '')          // "20260707_233015"
  const parts = name.split('_')
  if (parts.length === 2) {
    const dateStr = parts[0]  // "20260707"
    const timeStr = parts[1]  // "233015"
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}  ${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}:${timeStr.slice(4, 6)}`
  }
  return name
}

// 点击某个文件，拉取内容并展示
async function viewFileContent(file) {
  viewingFile.value = { title: formatFileDate(file.path), content: '' }
  isLoadingContent.value = true

  try {
    const url = `https://gitee.com/api/v5/repos/${giteeOwner.value}/${giteeRepo.value}/contents/${file.path}?access_token=${giteeToken.value}`
    const res = await fetch(url)
    if (!res.ok) throw new Error('无法获取文件内容')
    const data = await res.json()

    // data.content 是 Base64 编码，需要用 UTF-8 安全解码
    viewingFile.value.content = decodeBase64(data.content)
  } catch (error) {
    alert('❌ 加载内容失败: ' + error.message)
    viewingFile.value = null
  } finally {
    isLoadingContent.value = false
  }
}

// 从详情页返回列表
function backToList() {
  viewingFile.value = null
}

// 从历史视图返回写作视图
function backToEditor() {
  currentView.value = 'editor'
  viewingFile.value = null
}
</script>

<style scoped>
/* ==================== 全局 ==================== */
.container {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

h1 {
  font-size: 22px;
  color: #333;
  margin-bottom: 20px;
}

/* 输入框统一风格 */
input, textarea {
  width: 100%;
  padding: 12px;
  margin-bottom: 15px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-sizing: border-box;
}

textarea {
  height: 250px;
  resize: none;
}

input:focus, textarea:focus {
  outline: none;
  border-color: #fe7300;
}

/* ==================== 按钮 ==================== */
.primary-btn {
  width: 100%;
  padding: 14px;
  background-color: #fe7300;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s;
}

.primary-btn:active {
  background-color: #d96200;
}

.primary-btn:disabled {
  background-color: #ffb880;
  cursor: not-allowed;
}

.secondary-btn {
  width: 100%;
  padding: 12px;
  margin-top: 10px;
  background-color: #fff;
  color: #fe7300;
  border: 1px solid #fe7300;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.secondary-btn:active {
  background-color: #fff3e8;
}

.text-btn {
  width: 100%;
  margin-top: 15px;
  background: none;
  border: none;
  color: #888;
  font-size: 14px;
  cursor: pointer;
}

/* ==================== 配置区 ==================== */
.tips {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
}

/* ==================== 历史记录 ==================== */
.back-btn {
  display: inline-block;
  width: auto;
  padding: 8px 16px;
  margin-bottom: 20px;
  background: none;
  border: none;
  color: #fe7300;
  font-size: 15px;
  cursor: pointer;
}

.loading {
  text-align: center;
  padding: 40px 0;
  color: #999;
  font-size: 14px;
}

.empty-tips {
  text-align: center;
  padding: 40px 0;
  color: #999;
  font-size: 14px;
}

/* 列表 */
.list-view {
  margin-top: 5px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.15s;
}

.history-item:active {
  background-color: #f9f9f9;
}

.file-date {
  font-size: 15px;
  color: #333;
}

.file-arrow {
  font-size: 20px;
  color: #ccc;
}

/* 详情 */
.detail-title {
  font-size: 18px;
  color: #333;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #fe7300;
}

.detail-content {
  font-size: 15px;
  line-height: 1.7;
  color: #444;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
</style>
