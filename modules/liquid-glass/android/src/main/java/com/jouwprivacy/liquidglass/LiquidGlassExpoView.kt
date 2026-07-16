package com.jouwprivacy.liquidglass

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.view.Choreographer
import android.view.View
import android.view.ViewGroup
import com.qmdeve.liquidglass.widget.LiquidGlassView as QmLiquidGlassView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

/**
 * Expo view that hosts the QmDeve [QmLiquidGlassView] (GPU AGSL liquid glass)
 * and exposes its parameters to React Native. It is used by GlassCard as an
 * absolutely-positioned background layer; the card's content renders above it
 * in the RN tree.
 *
 * The glass refracts whatever ViewGroup it is *bound* to (its sampling source).
 * We bind the living-background container resolved from the React node handle in
 * [setSourceViewId] - the same target the expo-blur path samples. Without a
 * bound source the native view renders nothing, and below API 33 the library
 * itself is a no-op, so callers only mount this on API 33+.
 */
@SuppressLint("ViewConstructor")
class LiquidGlassExpoView(context: Context, appContext: AppContext) :
  ExpoView(context, appContext) {

  // The hosted QmDeve view is a plain Android ViewGroup, not an RN view, so RN
  // never measures/lays it out. Opt into Android's layout system so it gets a
  // real size (without this it stays 0x0 and the glass draws nothing).
  override val shouldUseAndroidLayout: Boolean = true

  val glass = QmLiquidGlassView(context).also {
    addView(
      it,
      ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      ),
    )
  }

  private var sourceViewId: Int? = null

  private fun dp(value: Float): Float = value * resources.displayMetrics.density

  fun setCornerRadiusDp(value: Float) = glass.setCornerRadius(dp(value))

  fun setRefractionHeightDp(value: Float) = glass.setRefractionHeight(dp(value))

  fun setRefractionOffsetDp(value: Float) = glass.setRefractionOffset(dp(value))

  /**
   * ARGB colour from JS `processColor` (an unsigned 32-bit value that overflows
   * Int, so it arrives as a Double; reinterpret the bits back to an int).
   */
  fun applyTint(color: Double?) {
    val c = color?.toLong()?.toInt() ?: Color.TRANSPARENT
    glass.setTintColorRed(Color.red(c) / 255f)
    glass.setTintColorGreen(Color.green(c) / 255f)
    glass.setTintColorBlue(Color.blue(c) / 255f)
    glass.setTintAlpha(Color.alpha(c) / 255f)
  }

  fun setSourceViewId(id: Int?) {
    sourceViewId = id
    bindSource()
  }

  private fun bindSource() {
    val id = sourceViewId ?: return
    val source = appContext.findView<View>(id) as? ViewGroup ?: return
    glass.bind(source)
  }

  // QmDeve re-samples the bound source only when its own view tree runs a draw
  // pass (its internal OnPreDrawListener). On a static screen whose subtree is
  // decoupled into its own layer (e.g. the login flow under a Reanimated
  // transform), that pass stops firing once the screen settles - so a glass that
  // first sampled before the Skia "living background" had rendered would cache an
  // empty frame and stay blank until something else repainted it (which is why a
  // cold first launch showed no glass but a second launch did). Drive an
  // invalidate every frame while attached so the glass keeps re-sampling: it
  // picks up the background as soon as it's ready and tracks its animation.
  private val frameCallback = object : Choreographer.FrameCallback {
    override fun doFrame(frameTimeNanos: Long) {
      glass.invalidate()
      if (isAttachedToWindow) Choreographer.getInstance().postFrameCallback(this)
    }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    // The source view may not be resolvable until the tree is attached.
    post { bindSource() }
    Choreographer.getInstance().postFrameCallback(frameCallback)
  }

  override fun onDetachedFromWindow() {
    Choreographer.getInstance().removeFrameCallback(frameCallback)
    super.onDetachedFromWindow()
  }
}
