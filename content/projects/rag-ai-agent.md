---
title: RAG-AI-Agent
slug: rag-ai-agent
type: project
order: 5
category: DOCUMENT QUESTION ANSWERING
role: AI / RAG Engineer
highlight: Chroma · page citations · Groq
summary: Upload PDFs, name an expert, and ask questions that cite the file and page.
status: active
featured: true
technologies:
  - Python
  - Streamlit
  - LangChain
  - ChromaDB
  - Groq
  - MiniLM
links:
  repository: https://github.com/yousefattaff/RAG-AI-Agent
media:
  image: /projects/rag-ai-agent-dr-insulino.jpg
what_it_does: Each expert is its own Chroma collection. If the files do not contain the answer, the app says so and skips the model.
architecture:
  - "Text pages are chunked and stored in Chroma."
  - "The question is searched with vectors and keywords, then reranked."
  - "Groq answers from those chunks and shows the page."
key_features:
  - "Llama 3.3 70B writes the answer. Llama 3.1 8B plans the search."
  - "PubMed and web search are not in this version."
---

Document question answering with local Chroma and page-level sources.

# What does my PDF assistant do? (en)

I built RAG-AI-Agent so users can upload PDFs, name an expert, and ask questions that cite the source file and page. Each expert's documents use a separate Chroma collection. The interface uses Streamlit, and the retrieval toolkit includes LangChain, ChromaDB, and MiniLM.

# How does search and generation work? (en)

Text pages are split into chunks, searched with vectors and keywords, and reranked. My public resume describes keeping the top four of 24 candidate chunks. Llama 3.1 8B plans the search, and Llama 3.3 70B writes the answer through Groq.

# What happens when the documents do not contain the answer? (en)

RAG-AI-Agent says when the uploaded files do not contain the answer and skips the model in that case. PubMed and web search are not part of this version. Its documented scope is question answering over the user's PDF collections.

# مساعد الـ PDF بتاعي بيعمل إيه؟ (ar)

بنيت RAG-AI-Agent عشان المستخدم يرفع ملفات PDF ويسمّي expert ويسأل أسئلة بإجابات بتذكر الملف والصفحة. مستندات كل expert ليها Chroma collection منفصلة. الواجهة Streamlit، وأدوات الاسترجاع تشمل LangChain و ChromaDB و MiniLM.

# البحث وتوليد الإجابة بيشتغلوا إزاي؟ (ar)

نص الصفحات بيتقسّم لأجزاء، وبعد البحث بالـ vectors والكلمات المفتاحية بيتعمل reranking. سيرتي الذاتية بتذكر اختيار أفضل أربع أجزاء من 24 جزء مرشح. Llama 3.1 8B بيخطط للبحث، و Llama 3.3 70B بيكتب الإجابة من خلال Groq.

# إيه اللي بيحصل لو المعلومة مش في المستندات؟ (ar)

RAG-AI-Agent بيوضح إن الإجابة مش موجودة في الملفات وبيتخطى الموديل في الحالة دي. النسخة دي مفيهاش PubMed أو بحث ويب. نطاقها الموثّق هو الإجابة عن أسئلة تخص مجموعات ملفات PDF الخاصة بالمستخدم.
