<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import { Camera, CameraResultType } from '@capacitor/camera'

	let imageUrl: string | null = null;

	const takePicture = async () => {
		const image = await Camera.getPhoto({
			quality: 90,
			allowEditing: true,
			resultType: CameraResultType.Uri,
		})

		imageUrl = image.webPath;

		// Can be set to the src of an image now
		const imageElement: HTMLImageElement | null = document.getElementById('imageElement') as HTMLImageElement;
        if (imageElement) {
            imageElement.src = imageUrl;
        }
	}

	const checkIfVegan = () => {
		// TODO: Implement vegan check logic
		console.log("Checking if the image is vegan...");
	}
</script>

<div class="flex flex-col items-center justify-center h-screen">
	<Button class="mb-4" on:click={takePicture}>Take Picture</Button>
	<div class="mt-4 flex flex-col items-center">
		<img alt="" src={imageUrl || ""} id="imageElement" class="w-3/4 mb-4" />
		{#if imageUrl}
			<Button on:click={checkIfVegan}>Is it vegan?</Button>
		{/if}
	</div>
</div>
