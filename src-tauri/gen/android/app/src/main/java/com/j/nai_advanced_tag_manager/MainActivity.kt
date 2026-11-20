package com.j.nai_advanced_tag_manager

import android.os.Bundle
import android.view.View
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
  private var webView: WebView? = null

  override fun onWebViewCreate(webView: WebView) {
    this.webView = webView
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    ViewCompat.setOnApplyWindowInsetsListener(findViewById<View>(android.R.id.content)) { view, insets ->
      val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
      view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
      val keyboard = (insets.getInsets(WindowInsetsCompat.Type.ime()).bottom - bars.bottom).coerceAtLeast(0)
      val keyboardCss = keyboard / resources.displayMetrics.density
      webView?.evaluateJavascript("dispatchEvent(new CustomEvent('keyboardinset', { detail: $keyboardCss }))", null)
      WindowInsetsCompat.CONSUMED
    }
  }
}
