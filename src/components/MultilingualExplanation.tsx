import React from 'react';
import { Select, Typography, Tag } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useStore, Patient } from '../store/useStore';

const { Text } = Typography;

interface MultilingualExplanationProps {
  patient: Patient;
}

const explanations: Record<string, Record<string, { title: string; body: string }>> = {
  Hypertension: {
    en: {
      title: 'Understanding High Blood Pressure',
      body: 'Your blood pressure is higher than normal. This means your heart is working harder to pump blood. Regular medication and a low-salt diet can help manage this condition.',
    },
    hi: {
      title: 'उच्च रक्तचाप को समझना',
      body: 'आपका रक्तचाप सामान्य से अधिक है। इसका मतलब है कि आपका दिल रक्त पंप करने के लिए अधिक मेहनत कर रहा है। नियमित दवा और कम नमक वाला आहार इस स्थिति को प्रबंधित करने में मदद कर सकता है।',
    },
    bn: {
      title: 'উচ্চ রক্তচাপ বোঝা',
      body: 'আপনার রক্তচাপ স্বাভাবিকের চেয়ে বেশি। এর মানে আপনার হৃদয় রক্ত পাম্প করতে বেশি পরিশ্রম করছে। নিয়মিত ওষুধ এবং কম লবণযুক্ত খাবার এই অবস্থা নিয়ন্ত্রণে সাহায্য করতে পারে।',
    },
  },
  'Post-op Recovery': {
    en: {
      title: 'Post-Surgery Recovery Guide',
      body: 'You are recovering well from surgery. Keep resting, take your prescribed medications, and watch for signs of infection like redness or swelling at the surgical site.',
    },
    hi: {
      title: 'सर्जरी के बाद रिकवरी गाइड',
      body: 'आप सर्जरी से अच्छी तरह से ठीक हो रहे हैं। आराम करते रहें, अपनी निर्धारित दवाएं लें, और सर्जिकल साइट पर लालिमा या सूजन जैसे संक्रमण के लक्षणों पर नज़र रखें।',
    },
    bn: {
      title: 'অপারেশন-পরবর্তী সুস্থতা নির্দেশিকা',
      body: 'আপনি অস্ত্রোপচার থেকে ভালোভাবে সুস্থ হচ্ছেন। বিশ্রাম নিন, নির্ধারিত ওষুধ খান এবং সার্জিক্যাল সাইটে লালভাব বা ফোলা সংক্রমণের লক্ষণ দেখুন।',
    },
  },
  'COPD Exacerbation': {
    en: {
      title: 'COPD Flare-Up Information',
      body: 'Your COPD symptoms have worsened. You may experience more breathlessness and wheezing. Use your inhaler as prescribed, avoid smoke and dust, and seek emergency care if breathing gets much worse.',
    },
    hi: {
      title: 'सीओपीडी भड़कने की जानकारी',
      body: 'आपके सीओपीडी के लक्षण बिगड़ गए हैं। आपको अधिक सांस फूलना और घरघराहट हो सकती है। निर्धारित के अनुसार अपने इनहेलर का उपयोग करें, धूम्रपान और धूल से बचें, और यदि सांस लेना बहुत खराब हो जाए तो आपातकालीन सहायता लें।',
    },
    bn: {
      title: 'সিওপিডি তীব্রতা সম্পর্কে তথ্য',
      body: 'আপনার সিওপিডি-র লক্ষণগুলি আরও খারাপ হয়েছে। আপনি বেশি শ্বাসকষ্ট ও শ্বাসে শি-শি শব্দ অনুভব করতে পারেন। নির্দেশ মতো ইনহেলার ব্যবহার করুন, ধোঁয়া ও ধুলো এড়িয়ে চলুন এবং শ্বাস নেওয়া অনেক কঠিন হলে জরুরি চিকিৎসা নিন।',
    },
  },
};

const defaultExplanation = {
  en: {
    title: 'Patient Health Summary',
    body: 'Your health condition is being monitored. Please follow your doctor\'s advice, take prescribed medications on time, and report any new symptoms immediately.',
  },
  hi: {
    title: 'रोगी स्वास्थ्य सारांश',
    body: 'आपकी स्वास्थ्य स्थिति की निगरानी की जा रही है। कृपया अपने डॉक्टर की सलाह का पालन करें, निर्धारित दवाएं समय पर लें, और किसी भी नए लक्षण की तुरंत रिपोर्ट करें।',
  },
  bn: {
    title: 'রোগীর স্বাস্থ্য সারাংশ',
    body: 'আপনার স্বাস্থ্যের অবস্থা পর্যবেক্ষণ করা হচ্ছে। অনুগ্রহ করে আপনার ডাক্তারের পরামর্শ অনুসরণ করুন, নির্ধারিত ওষুধ সময়মতো খান এবং কোনো নতুন উপসর্গ দেখা দিলে তৎক্ষণাৎ জানান।',
  },
};

const languageLabels: Record<string, { name: string; flag: string }> = {
  en: { name: 'English', flag: '🇺🇸' },
  hi: { name: 'हिन्दी', flag: '🇮🇳' },
  bn: { name: 'বাংলা', flag: '🇧🇩' },
};

export function MultilingualExplanation({ patient }: MultilingualExplanationProps) {
  const { settings, updateSettings } = useStore();
  const lang = settings.language === 'es' || settings.language === 'fr' ? 'en' : settings.language;

  const conditionExplanations = explanations[patient.condition] || defaultExplanation;
  const explanation = conditionExplanations[lang] || conditionExplanations['en'];

  if (!settings.multilingualExplanations) return null;

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: 20,
        boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GlobalOutlined style={{ color: '#4f46e5', fontSize: 16 }} />
          <Text strong style={{ fontSize: 14 }}>Patient Explanation</Text>
          <Tag color="purple" style={{ borderRadius: 6, fontSize: 11 }}>AI Translated</Tag>
        </div>
        <Select
          value={lang}
          onChange={(v) => updateSettings({ language: v as any })}
          size="small"
          style={{ width: 130 }}
          options={Object.entries(languageLabels).map(([value, { name, flag }]) => ({
            value,
            label: `${flag} ${name}`,
          }))}
        />
      </div>

      <div
        style={{
          background: '#fafbff',
          border: '1px solid #e8e8ff',
          borderRadius: 10,
          padding: 16,
        }}
      >
        <Text strong style={{ fontSize: 14, color: '#1e293b', display: 'block', marginBottom: 8 }}>
          {explanation.title}
        </Text>
        <Text style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
          {explanation.body}
        </Text>
      </div>

      <div style={{ marginTop: 8, textAlign: 'right' }}>
        <Text style={{ fontSize: 11, color: '#94a3b8' }}>
          This is a simplified explanation for the patient. Clinical decisions should be based on medical records.
        </Text>
      </div>
    </div>
  );
}
