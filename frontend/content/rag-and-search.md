---
title: Document Retrieval, RAG, and Search in My Projects
slug: rag-and-search
type: expertise
order: 20
sources:
  - frontend/public/resume.pdf
  - content/projects/rag-ai-agent.md
  - content/projects/egyptian-savory-scout.md
  - content/projects/deal-breaker.md
---

# What is your practical RAG experience? (en)

I build document retrieval pipelines with LangChain and ChromaDB. In RAG-AI-Agent, users upload PDFs, name an expert, and ask questions with file and page citations. Each expert's PDF set has its own Chroma collection, keeping the document groups separate.

# How does your PDF assistant find evidence? (en)

RAG-AI-Agent chunks text pages, searches with vectors and keywords, and reranks the results. My public resume describes keeping the top four of 24 candidate chunks. Groq produces the answer from the retrieved chunks, and the interface shows the source file and page.

# Do all your retrieval projects use a vector database? (en)

My projects use different retrieval approaches. RAG-AI-Agent uses ChromaDB for document question answering. EgyptianSavoryScout filters restaurants by city and ranks them with TF-IDF, without a vector database. DealBreaker uses ChromaDB and MiniLM embeddings for product-data retrieval.

# إيه خبرتك العملية في RAG؟ (ar)

ببني document retrieval pipelines باستخدام LangChain و ChromaDB. في RAG-AI-Agent المستخدم بيرفع ملفات PDF وبيسمّي expert وبيسأل أسئلة بإجابات فيها اسم الملف ورقم الصفحة. كل مجموعة ملفات ليها Chroma collection مستقلة.

# مساعد الـ PDF بيلاقي المعلومات إزاي؟ (ar)

RAG-AI-Agent بيقسّم نص الصفحات وبيبحث بالـ vectors والكلمات المفتاحية وبيرتّب النتائج تاني. سيرتي الذاتية بتذكر اختيار أفضل أربع أجزاء من 24 جزء مرشح. Groq بيكتب الإجابة من الأجزاء المسترجعة، والواجهة بتعرض الملف والصفحة.

# كل مشروعات الاسترجاع عندك بتستخدم vector database؟ (ar)

المشاريع بتستخدم طرق استرجاع مختلفة. RAG-AI-Agent بيستخدم ChromaDB لأسئلة المستندات. EgyptianSavoryScout بيفلتر المطاعم حسب المدينة وبيرتّبها بـ TF-IDF من غير vector database. و DealBreaker بيستخدم ChromaDB و MiniLM embeddings لاسترجاع بيانات المنتجات.
