import './styles/base.css'
import './styles/components.css'

// Set footer year
const yearEl = document.getElementById('footer-year')
if (yearEl) yearEl.textContent = new Date().getFullYear()

// Scroll reveal for cards
const cards = document.querySelectorAll('.sim-card')
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1'
          entry.target.style.transform = 'translateY(0)'
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.1 }
  )

  cards.forEach((card, i) => {
    card.style.opacity = '0'
    card.style.transform = 'translateY(20px)'
    card.style.transition = `opacity 0.4s ease ${i * 0.1}s, transform 0.4s ease ${i * 0.1}s`
    observer.observe(card)
  })
}
