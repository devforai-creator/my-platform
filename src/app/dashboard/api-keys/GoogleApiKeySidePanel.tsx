'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface GoogleApiKeySidePanelProps {
  isOpen: boolean
  onClose: () => void
}

const steps = [
  {
    step: 1,
    title: 'Google AI Studio 접속',
    description: '아래 버튼을 클릭하여 Google AI Studio를 새 탭에서 엽니다.',
    image: '/guides/google-api/api발급2.png',
    action: {
      label: 'Google AI Studio 열기',
      url: 'https://aistudio.google.com/app/apikey',
    },
  },
  {
    step: 2,
    title: 'API 키 만들기 클릭',
    description: 'Google AI Studio 페이지에서 "API 키 만들기" 버튼을 클릭합니다.',
    image: '/guides/google-api/api발급2.png',
  },
  {
    step: 3,
    title: '프로젝트 생성',
    description: '새 키 만들기 모달에서 "Create project" 버튼을 클릭하여 새 프로젝트를 생성합니다.',
    image: '/guides/google-api/api발급3.png',
  },
  {
    step: 4,
    title: 'API 키 복사',
    description: '생성된 API 키 옆의 복사 버튼을 클릭하여 클립보드에 복사합니다.',
    image: '/guides/google-api/api발급4.png',
  },
  {
    step: 5,
    title: 'API 키 등록',
    description: '복사한 API 키를 왼쪽 폼의 "API Key" 입력란에 붙여넣고 "API 키 등록" 버튼을 클릭합니다.',
    image: '/guides/google-api/api발급5.png',
  },
]

export default function GoogleApiKeySidePanel({
  isOpen,
  onClose,
}: GoogleApiKeySidePanelProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
      // Prevent body scroll when panel is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(() => {
      onClose()
    }, 300) // Animation duration
  }

  const currentStepData = steps[currentStep]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Side Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-[600px] bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-y-auto transform transition-transform duration-300 ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Google Gemini API 키 발급
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              단계를 따라 API 키를 발급받으세요
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="닫기"
          >
            <svg
              className="w-6 h-6 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              단계 {currentStep + 1} / {steps.length}
            </span>
            <div className="flex gap-1.5">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-blue-600'
                      : index < currentStep
                      ? 'w-2 bg-green-600'
                      : 'w-2 bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
            {currentStepData.title}
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {currentStepData.description}
          </p>

          {/* Action Button */}
          {currentStepData.action && (
            <a
              href={currentStepData.action.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <span>{currentStepData.action.label}</span>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          )}

          {/* Image */}
          <div className="relative w-full bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shadow-md mb-6">
            <Image
              src={currentStepData.image}
              alt={currentStepData.title}
              width={600}
              height={400}
              className="w-full h-auto"
              priority={currentStep === 0}
            />
          </div>

          {/* Tips */}
          {currentStep === 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex gap-2">
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                    💡 팁
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-400 mt-1">
                    Google 계정이 필요합니다. 로그인이 안 되어 있다면 먼저
                    로그인하세요.
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex gap-2">
                <svg
                  className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-900 dark:text-green-300">
                    🎉 거의 다 왔습니다!
                  </p>
                  <p className="text-sm text-green-800 dark:text-green-400 mt-1">
                    이제 왼쪽 폼에 API 키를 붙여넣고 등록하면 완료됩니다.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentStep === 0
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              이전
            </button>

            <div className="flex gap-2">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-blue-600'
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }`}
                  aria-label={`${index + 1}단계로 이동`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              disabled={currentStep === steps.length - 1}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentStep === steps.length - 1
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
