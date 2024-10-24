<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import { Camera, CameraResultType } from '@capacitor/camera'
	import { OpenAI } from 'openai'
    import { PUBLIC_OPENAI_API_KEY } from '$env/static/public'
	import { supabase } from '$lib/supabase'

	const openai = new OpenAI({
		apiKey: PUBLIC_OPENAI_API_KEY,
		dangerouslyAllowBrowser: true, // Note: Be cautious with this in production
	})

	let imageUrl: string | null = null

	const takePicture = async () => {
		const image = await Camera.getPhoto({
			quality: 90,
			allowEditing: true,
			resultType: CameraResultType.Uri,
		})
        if (image.webPath) {
            imageUrl = image.webPath
        }

		// Can be set to the src of an image now
		const imageElement: HTMLImageElement | null = document.getElementById(
			'imageElement'
		) as HTMLImageElement
		if (imageElement) {
			imageElement.src = imageUrl
		}
	}
	
	async function checkIfVegan() {
	}

	async function checkIfVegan1(): Promise<boolean> {
		console.log('checking if vegan')
		if (!imageUrl) {
			console.error('No image URL available')
			return false
		}

		try {
			// Fetch the image and convert it to base64
			const response = await fetch(imageUrl)
			const blob = await response.blob()
			const base64Image = await blobToBase64(blob)

			console.log('sending image to openai', base64Image.length)
			const openaiResponse = await openai.chat.completions.create({
				model: "gpt-4o",
				messages: [
					{
						role: "user",
						content: [
							{
								type: "text",
								text: "Analyze the ingredients contained in this photo to determine whether or not the product is vegan. Ignore anything in the photo that does not appear to be ingredients."
							},
							{
								type: "image_url",
								image_url: {
									url: `data:image/jpeg;base64,${base64Image}`
								}
							}
						]
					}
				],
				max_tokens: 300
			})

			const analysis = openaiResponse.choices[0].message.content;
			console.log(analysis)
			const analysisElement: HTMLDivElement | null = document.getElementById('analysis') as HTMLDivElement;
			if (analysisElement) {
				analysisElement.textContent = analysis;
			}
			// Simple logic to determine if vegan (you may want to enhance this)
			const isVegan = analysis?.toLowerCase().includes('vegan') && !analysis.toLowerCase().includes('not vegan');
			if (isVegan) {
				alert('Vegan!')
			} else {
				alert('Not vegan!')
			}
			return isVegan
		} catch (error) {
			console.error('Error in checkIfVegan:', error)
			alert('An error occurred while checking the image')
			return false
		}
	}

	// New helper function to convert Blob to base64
	function blobToBase64(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = () => {
				if (typeof reader.result === 'string') {
					resolve(reader.result.split(',')[1])
				} else {
					reject(new Error('Failed to convert blob to base64'))
				}
			}
			reader.onerror = error => reject(error)
			reader.readAsDataURL(blob)
		})
	}
</script>

<div class="flex flex-col items-center justify-center min-h-screen overflow-y-auto">
	<div class="py-8">
		<Button class="mb-4 mt-20" on:click={takePicture}>Take Picture</Button>
		<div class="mt-4 flex flex-col items-center">
			<img alt="" src={imageUrl || ''} id="imageElement" class="w-3/4 mb-4" />
			<Button disabled={!imageUrl} on:click={checkIfVegan}>Is it vegan?</Button>
			<div id="analysis"></div>
		</div>
	</div>
</div>
