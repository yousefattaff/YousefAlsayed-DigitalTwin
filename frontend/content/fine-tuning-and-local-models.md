---
title: Fine-Tuning, Qwen, QLoRA, and Local Models
slug: fine-tuning-and-local-models
type: expertise
order: 21
sources:
  - backend/data/linkedin.pdf
  - content/projects/egyptian-savory-scout.md
  - content/expertise.md
---

# What is your experience with model fine-tuning? (en)

My learning and hands-on experiments include fine-tuning smaller local Qwen models with QLoRA. My professional profile lists fine-tuning and PyTorch among my skills. This work sits alongside my document-retrieval and agent projects.

# Where have you used a locally fine-tuned model? (en)

EgyptianSavoryScout uses a Qwen2 1.5B explainer model fine-tuned with Unsloth, exported to GGUF, and served locally through Ollama. After city filtering and TF-IDF retrieval, the model explains the top five restaurant recommendations.

# How do retrieval and the local model work together? (en)

In EgyptianSavoryScout, the city filter and TF-IDF ranker select relevant restaurants from the dataset. The locally fine-tuned Qwen2 model then explains those selections. FastAPI serves the backend, and React provides the interface.

# إيه خبرتك في fine-tuning؟ (ar)

تعلّمي وتجربتي العملية بيشملوا fine-tuning لموديلات Qwen محلية صغيرة باستخدام QLoRA. ملفي المهني بيذكر fine-tuning و PyTorch ضمن مهاراتي، بجانب مشروعات استرجاع المستندات والـ agents.

# استخدمت موديل محلي متدرّب فين؟ (ar)

EgyptianSavoryScout بيستخدم Qwen2 بحجم 1.5B، عملت له fine-tuning باستخدام Unsloth، واتصدّر بصيغة GGUF وبيشتغل محليًا عن طريق Ollama. بعد فلترة المدينة واسترجاع النتائج بـ TF-IDF، الموديل بيشرح أفضل خمس ترشيحات للمطاعم.

# الاسترجاع والموديل المحلي بيتكاملوا إزاي؟ (ar)

في EgyptianSavoryScout فلتر المدينة وترتيب TF-IDF بيختاروا المطاعم المناسبة من البيانات. بعد كده موديل Qwen2 المحلي بيشرح الاختيارات. الـ backend بيستخدم FastAPI، والواجهة مبنية بـ React.
