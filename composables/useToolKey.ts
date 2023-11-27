import { marked } from 'marked'
import api from '~/utils/api'
// import DOMPurify from 'dompurify'

export const useToolKey = () => {
  const inited = ref(false)
  const markdownElement = ref<HTMLDivElement>()
  const route = useRoute()
  const router = useRouter()
  const tool_id = (route.params.tool_id || '') as string

  const toolStore = useToolStore()

  const toolName = computed(() => {
    const tool = toolStore.tools[tool_id]
    if (tool?.zh) {
      return tool.zh
    }
    return tool_id as string
  })

  const render = (md: string) => {
    const html = marked.parse(md)
    // mp-mi
    nextTick(async () => {
      if (!markdownElement.value) return
      const miList = markdownElement.value.querySelectorAll('mp-mi') as unknown as HTMLDivElement[]
      for (const mi of miList) {
        const encrypted = mi.querySelector('span')?.innerText || mi.innerText
        mi.innerHTML = `<span>${encrypted}</span><input placeholder="输入密码" /><a>解密</a>`
      }
    })

    // const clean = DOMPurify.sanitize(html, { ADD_TAGS: ['mp-mi'] })
    return html
  }

  const markdown = ref('')
  const markdownOld = ref('')
  const init = () => {
    const tool = toolStore.tools[tool_id]
    const text = tool?.how_to_use
    if (text) {
      markdown.value = text
      markdownOld.value = text
    }
  }

  const initMarked = () => {
    marked.use({
      breaks: true,
    })

    const renderer = new marked.Renderer()
    renderer.link = function (href, title, text) {
      const div = document.createElement('div')
      const a = document.createElement('a')
      a.href = href
      a.target = '_blank'
      if (title) {
        a.title = title
      }
      a.textContent = text
      div.appendChild(a)
      return div.innerHTML
    }
    marked.setOptions({
      renderer: renderer,
    })
  }

  const publish = async () => {
    const res = await api({
      method: 'put',
      url: '/tool/update.how_to_use',
      data: {
        id: tool_id,
        markdown: markdown.value,
      },
    })
    if (res.data?.statusCode === 1004) {
      router.push('/login')
      return
    }
    if (res.data === true) {
      mp.success('发布成功！')
    }
  }

  const publishGuide = async () => {
    ElMessageBox.prompt('', '请输入【我要发布】', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputValidator: (v) => {
        if (v === '我要发布') {
          return true
        }
        return '请输入【我要发布】'
      },
      beforeClose: async (action, instance, done) => {
        if (action === 'confirm') {
          instance.confirmButtonLoading = true
          instance.confirmButtonText = '发布中...'
          await publish()
          instance.confirmButtonLoading = false
          done()
        } else {
          done()
        }
      },
    })
      .then(() => {})
      .catch(() => {})
  }

  if (process.client) {
    initMarked()
    init()
  }

  watch(
    () => toolStore.tools,
    () => {
      inited.value = true
      init()
    },
  )

  return {
    inited,
    toolName,
    markdownElement,
    markdown,
    markdownOld,
    render,
    publishGuide,
  }
}
