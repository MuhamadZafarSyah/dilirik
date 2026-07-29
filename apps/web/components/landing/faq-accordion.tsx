"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useState } from "react"

import { faqs } from "@/lib/landing/faqs"

/**
 * Akordeon FAQ tanpa kotak: tiap butir hanya dipisah garis tipis, dan tanda
 * buka tutup memakai plus dan minus. Tinggi dianimasikan karena gerak di sini
 * menjelaskan isi yang muncul, bukan hiasan.
 */
export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="shell mx-auto max-w-shell scroll-mt-20 border-t border-line py-20">
      <h2 className="hand max-w-2xl text-4xl leading-tight text-ink sm:text-5xl">
        Pertanyaan yang sering masuk
      </h2>

      <div className="mt-10 max-w-3xl divide-y divide-line border-t border-line">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index
          const panelId = "faq-panel-" + index

          return (
            <div key={faq.question}>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center justify-between gap-6 py-5 text-left"
              >
                <span className="text-base font-medium text-ink sm:text-lg">
                  {faq.question}
                </span>
                <span
                  aria-hidden="true"
                  className="shrink-0 text-lg leading-none text-muted"
                >
                  {isOpen ? "-" : "+"}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={panelId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="max-w-2xl pb-6 text-sm leading-relaxed text-muted sm:text-base">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </section>
  )
}
